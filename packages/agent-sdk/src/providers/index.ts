/**
 * LLM Provider Factory
 *
 * Creates the appropriate provider based on provider ID.
 */

export type {
  ApiType,
  LLMProvider,
  CreateMessageParams,
  CreateMessageResponse,
  NormalizedMessageParam,
  NormalizedContentBlock,
  NormalizedTool,
  NormalizedResponseBlock
} from './types.js'

export { VercelAIProvider } from './vercel.js'

import type { LLMProvider } from './types.js'
import { VercelAIProvider } from './vercel.js'

/**
 * Create an LLM provider based on the provider ID.
 *
 * @param providerId - Provider ID (anthropic, openai, deepseek, etc.)
 * @param opts - API credentials
 */
export function createProvider(
  providerId: string,
  opts: { apiKey: string; baseURL?: string },
): LLMProvider {
  return new VercelAIProvider({ providerId, ...opts })
}