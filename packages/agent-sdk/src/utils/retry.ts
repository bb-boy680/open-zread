/**
 * Retry Logic with Exponential Backoff
 *
 * Handles API retries for rate limits, overloaded servers,
 * and transient failures.
 */

/** Error object with status code */
interface ErrorWithStatus {
  status?: number
  code?: string
  error?: { type?: string }
  message?: string
}

/**
 * Extract error properties safely
 */
function getErrorInfo(err: unknown): ErrorWithStatus {
  if (err instanceof Error) {
    return {
      status: (err as Error & { status?: number }).status,
      code: (err as Error & { code?: string }).code,
      message: err.message,
    }
  }
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>
    const errorObj = typeof obj.error === 'object' && obj.error !== null
      ? obj.error as Record<string, unknown>
      : undefined
    return {
      status: typeof obj.status === 'number' ? obj.status : undefined,
      code: typeof obj.code === 'string' ? obj.code : undefined,
      error: errorObj
        ? { type: typeof errorObj.type === 'string' ? errorObj.type as string : undefined }
        : undefined,
      message: typeof obj.message === 'string' ? obj.message : undefined,
    }
  }
  return {}
}

/**
 * Retry configuration.
 */
export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryableStatusCodes: number[]
  /** 重试前回调（用于通知 UI） */
  onRetry?: (info: { attempt: number; maxRetries: number; delayMs: number; error: string }) => void
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  retryableStatusCodes: [401, 403, 429, 500, 502, 503, 529],
}

/**
 * Check if an error is retryable.
 */
export function isRetryableError(err: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  const info = getErrorInfo(err)
  if (info.status && config.retryableStatusCodes.includes(info.status)) {
    return true
  }

  // Network errors
  if (info.code === 'ECONNRESET' || info.code === 'ETIMEDOUT' || info.code === 'ECONNREFUSED') {
    return true
  }

  // API overloaded
  if (info.error?.type === 'overloaded_error') {
    return true
  }

  return false
}

/**
 * Calculate delay for retry.
 * Fixed delay: always use baseDelayMs.
 */
export function getRetryDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  return config.baseDelayMs
}

/**
 * Execute a function with retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  abortSignal?: AbortSignal,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (abortSignal?.aborted) {
      throw new Error('Aborted')
    }

    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err


      if (!isRetryableError(err, config)) {
        throw err
      }

      if (attempt === config.maxRetries) {
        throw err
      }

      // Wait before retry
      const delay = getRetryDelay(attempt, config)


      // 调用回调通知重试状态
      config.onRetry?.({
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delayMs: delay,
        error: formatApiError(err),
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Check if an error is a "prompt too long" error.
 */
export function isPromptTooLongError(err: unknown): boolean {
  const info = getErrorInfo(err)
  if (info.status === 400) {
    const message = info.message || ''
    return message.includes('prompt is too long') ||
      message.includes('max_tokens') ||
      message.includes('context length')
  }
  return false
}

/**
 * Check if error is an auth error.
 */
export function isAuthError(err: unknown): boolean {
  const info = getErrorInfo(err)
  return info.status === 401 || info.status === 403
}

/**
 * Check if error is a rate limit error.
 */
export function isRateLimitError(err: unknown): boolean {
  const info = getErrorInfo(err)
  return info.status === 429
}

/**
 * Format an API error for display.
 */
export function formatApiError(err: unknown): string {
  const info = getErrorInfo(err)
  if (isAuthError(err)) {
    return 'Authentication failed. Check your CODEANY_API_KEY.'
  }
  if (isRateLimitError(err)) {
    return 'Rate limit exceeded. Please retry after a short wait.'
  }
  if (info.status === 529) {
    return 'API overloaded. Please retry later.'
  }
  if (isPromptTooLongError(err)) {
    return 'Prompt too long. Auto-compacting conversation...'
  }
  return `API error: ${info.message || String(err)}`
}
