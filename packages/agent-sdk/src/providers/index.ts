/**
 * LLM Provider Factory
 *
 * Creates the appropriate provider based on API type configuration.
 * Accepts both ApiType values and common provider IDs (e.g., 'anthropic', 'openai').
 */

export type { ApiType, LLMProvider, CreateMessageParams, CreateMessageResponse, NormalizedMessageParam, NormalizedContentBlock, NormalizedTool, NormalizedResponseBlock } from './types.js'

export { AnthropicProvider } from './anthropic.js'
export { OpenAIProvider } from './openai.js'

import type { ApiType, LLMProvider } from './types.js'
import { AnthropicProvider } from './anthropic.js'
import { OpenAIProvider } from './openai.js'

/**
 * Provider ID to ApiType mapping.
 * Allows users to pass 'anthropic' instead of 'anthropic-messages'.
 */
const PROVIDER_ID_TO_API_TYPE: Record<string, ApiType> = {
  'anthropic': 'anthropic-messages',
  'anthropic-messages': 'anthropic-messages',
  'openai': 'openai-completions',
  'openai-completions': 'openai-completions',
  'openai-compatible': 'openai-completions',
  'deepseek': 'openai-completions',
  'zhipu': 'openai-completions',
  'qwen': 'openai-completions',
  'moonshot': 'openai-completions',
}

/**
 * Create an LLM provider based on provider ID or API type.
 *
 * @param providerIdOrApiType - Provider ID ('anthropic', 'openai') or ApiType ('anthropic-messages', 'openai-completions')
 * @param opts - API credentials
 */
export function createProvider(
  providerIdOrApiType: string,
  opts: { apiKey?: string; baseURL?: string },
): LLMProvider {
  // Map provider ID to ApiType
  const apiType = PROVIDER_ID_TO_API_TYPE[providerIdOrApiType]
  if (!apiType) {
    throw new Error(`Unsupported provider: ${providerIdOrApiType}. Supported: anthropic, openai, openai-compatible, deepseek, zhipu, qwen, moonshot`)
  }

  switch (apiType) {
    case 'anthropic-messages':
      return new AnthropicProvider(opts)
    case 'openai-completions':
      return new OpenAIProvider(opts)
    default:
      throw new Error(`Unsupported API type: ${apiType}`)
  }
}
