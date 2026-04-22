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

    // ========== 中国本地 LLM 服务 ==========

    doubao: {
      id: 'doubao',
      name: '豆包 (字节跳动)',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://ark.cn-beijing.volces.com/api/v3',
      models: {
        'doubao-pro-4k': { id: 'doubao-pro-4k', name: 'Doubao Pro 4K', max_tokens: 4096, supports_tools: true },
        'doubao-pro-32k': { id: 'doubao-pro-32k', name: 'Doubao Pro 32K', max_tokens: 32768, supports_tools: true },
        'doubao-pro-128k': { id: 'doubao-pro-128k', name: 'Doubao Pro 128K', max_tokens: 131072, supports_tools: true },
      },
    },

    yi: {
      id: 'yi',
      name: '零一万物 (Yi)',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.lingyiwanwu.com/v1',
      models: {
        'yi-large': { id: 'yi-large', name: 'Yi Large', max_tokens: 16384, supports_tools: true },
        'yi-medium': { id: 'yi-medium', name: 'Yi Medium', max_tokens: 8192 },
        'yi-spark': { id: 'yi-spark', name: 'Yi Spark', max_tokens: 4096 },
      },
    },

    baichuan: {
      id: 'baichuan',
      name: '百川智能',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.baichuan-ai.com/v1',
      models: {
        'Baichuan4': { id: 'Baichuan4', name: 'Baichuan 4', max_tokens: 8192, supports_tools: true },
        'Baichuan3-Turbo': { id: 'Baichuan3-Turbo', name: 'Baichuan 3 Turbo', max_tokens: 8192 },
        'Baichuan2-Turbo': { id: 'Baichuan2-Turbo', name: 'Baichuan 2 Turbo', max_tokens: 4096 },
      },
    },

    baidu: {
      id: 'baidu',
      name: '百度文心一言',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      models: {
        'ernie-4.0-8k': { id: 'ernie-4.0-8k', name: 'ERNIE 4.0 8K', max_tokens: 8192, supports_tools: true },
        'ernie-3.5-8k': { id: 'ernie-3.5-8k', name: 'ERNIE 3.5 8K', max_tokens: 8192 },
        'ernie-speed-8k': { id: 'ernie-speed-8k', name: 'ERNIE Speed 8K', max_tokens: 8192 },
      },
    },

    stepfun: {
      id: 'stepfun',
      name: '阶跃星辰 (Step)',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.stepfun.com/v1',
      models: {
        'step-1-8k': { id: 'step-1-8k', name: 'Step 1 8K', max_tokens: 8192, supports_tools: true },
        'step-1-32k': { id: 'step-1-32k', name: 'Step 1 32K', max_tokens: 32768, supports_tools: true },
        'step-1-128k': { id: 'step-1-128k', name: 'Step 1 128K', max_tokens: 131072 },
      },
    },

    // ========== 国际 LLM 服务 ==========

    google: {
      id: 'google',
      name: 'Google Gemini',
      npm: '@ai-sdk/google',
      models: {
        'gemini-2.0-flash': { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', max_tokens: 8192, supports_vision: true, supports_tools: true },
        'gemini-1.5-pro': { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', max_tokens: 32768, supports_vision: true, supports_tools: true },
        'gemini-1.5-flash': { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', max_tokens: 8192, supports_vision: true },
      },
    },

    mistral: {
      id: 'mistral',
      name: 'Mistral AI',
      npm: '@ai-sdk/mistral',
      models: {
        'mistral-large-2': { id: 'mistral-large-2', name: 'Mistral Large 2', max_tokens: 8192, supports_tools: true },
        'mistral-medium': { id: 'mistral-medium', name: 'Mistral Medium', max_tokens: 8192 },
        'mistral-small': { id: 'mistral-small', name: 'Mistral Small', max_tokens: 8192 },
      },
    },

    cohere: {
      id: 'cohere',
      name: 'Cohere',
      npm: '@ai-sdk/cohere',
      models: {
        'command-r': { id: 'command-r', name: 'Command R', max_tokens: 8192, supports_tools: true },
        'command-r-plus': { id: 'command-r-plus', name: 'Command R+', max_tokens: 16384, supports_tools: true },
        'command': { id: 'command', name: 'Command', max_tokens: 4096 },
      },
    },

    groq: {
      id: 'groq',
      name: 'Groq (极速推理)',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.groq.com/openai/v1',
      models: {
        'llama-3.3-70b-versatile': { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', max_tokens: 8192, supports_tools: true },
        'llama-3.1-8b-instant': { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', max_tokens: 8192 },
        'mixtral-8x7b-32768': { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', max_tokens: 32768 },
      },
    },

    xai: {
      id: 'xai',
      name: 'xAI (Grok)',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.x.ai/v1',
      models: {
        'grok-2-1212': { id: 'grok-2-1212', name: 'Grok 2', max_tokens: 8192, supports_tools: true },
        'grok-beta': { id: 'grok-beta', name: 'Grok Beta', max_tokens: 8192 },
      },
    },

    perplexity: {
      id: 'perplexity',
      name: 'Perplexity AI',
      npm: '@ai-sdk/openai-compatible',
      base_url: 'https://api.perplexity.ai',
      models: {
        'llama-3.1-sonar-large-128k-online': { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', max_tokens: 131072 },
        'llama-3.1-sonar-small-128k-online': { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', max_tokens: 131072 },
      },
    },
  },
}