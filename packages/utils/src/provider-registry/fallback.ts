import type { ProviderRegistryData } from './types.js'

/**
 * 内置 Fallback Provider 列表
 * 当 Models.dev 同步失败时使用
 */
export const FALLBACK_PROVIDERS: ProviderRegistryData = {
  version: 'fallback-1.0.0',
  synced_at: new Date().toISOString(),
  providers: {
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic',
      npm: '@ai-sdk/anthropic',
      models: {
        'claude-sonnet-4-6': {
          id: 'claude-sonnet-4-6',
          name: 'Claude Sonnet 4.6',
          max_tokens: 16384,
          supports_tools: true,
          supports_vision: true,
          supports_thinking: true,
        },
        'claude-opus-4-6': {
          id: 'claude-opus-4-6',
          name: 'Claude Opus 4.6',
          max_tokens: 16384,
          supports_tools: true,
          supports_vision: true,
          supports_thinking: true,
        },
      },
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      npm: '@ai-sdk/openai',
      models: {
        'gpt-4o': { id: 'gpt-4o', name: 'GPT-4o', max_tokens: 16384, supports_tools: true },
        'gpt-4o-mini': { id: 'gpt-4o-mini', name: 'GPT-4o Mini', max_tokens: 16384, supports_tools: true },
      },
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.deepseek.com/v1',
      models: {
        'deepseek-chat': { id: 'deepseek-chat', name: 'DeepSeek Chat', max_tokens: 8192, supports_tools: true },
        'deepseek-reasoner': { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', max_tokens: 8192, supports_thinking: true },
      },
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://openrouter.ai/api/v1',
      models: {},
    },
    moonshot: {
      id: 'moonshot',
      name: 'Moonshot (Kimi)',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.moonshot.cn/v1',
      models: {
        'moonshot-v1-8k': { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', max_tokens: 8192 },
        'moonshot-v1-32k': { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', max_tokens: 32768 },
      },
    },
    minimax: {
      id: 'minimax',
      name: 'MiniMax',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.minimax.chat/v1',
      models: {},
    },
    zhipu: {
      id: 'zhipu',
      name: '智谱 AI',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://open.bigmodel.cn/api/paas/v4',
      models: {
        'glm-4': { id: 'glm-4', name: 'GLM-4', max_tokens: 8192 },
        'glm-4-flash': { id: 'glm-4-flash', name: 'GLM-4 Flash', max_tokens: 8192 },
        'glm-5': { id: 'glm-5', name: 'GLM-5', max_tokens: 8192 },
      },
    },
    qwen: {
      id: 'qwen',
      name: '阿里云通义千问',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: {
        'qwen-turbo': { id: 'qwen-turbo', name: 'Qwen Turbo', max_tokens: 8192 },
        'qwen-plus': { id: 'qwen-plus', name: 'Qwen Plus', max_tokens: 32768 },
      },
    },
    custom: {
      id: 'custom',
      name: '自定义 (OpenAI-Compatible)',
      npm: '@ai-sdk/openai-compatible',
      base_url: '',
      models: {},
    },
  },
}