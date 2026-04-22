import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ProviderRegistryData } from './types.js';
import { FALLBACK_PROVIDERS } from './fallback.js';

const CACHE_FILENAME = 'providers.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Models.dev API URL (待验证)
 *
 * Models.dev 是 BerriAI 提供的 LLM Provider 元数据注册表
 * 官方 GitHub: https://github.com/BerriAI/litellm
 *
 * 注意: 该 URL 需要根据实际 API 结构进行调整
 */
const MODELS_DEV_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

function getZreadDir(): string {
  return path.join(os.homedir(), '.zread');
}

function getCachePath(): string {
  return path.join(getZreadDir(), CACHE_FILENAME);
}

async function isCacheValid(): Promise<boolean> {
  try {
    const cachePath = getCachePath();
    const stat = await fs.stat(cachePath);
    const content = await fs.readFile(cachePath, 'utf-8');
    const data = JSON.parse(content) as ProviderRegistryData;
    // 检查 synced_at 字段是否在 TTL 内
    const syncedAt = new Date(data.synced_at).getTime();
    return Date.now() - syncedAt < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

async function saveCache(data: ProviderRegistryData): Promise<void> {
  const zreadDir = getZreadDir();
  await fs.mkdir(zreadDir, { recursive: true });
  await fs.writeFile(getCachePath(), JSON.stringify(data, null, 2), 'utf-8');
}

async function loadCache(): Promise<ProviderRegistryData> {
  const content = await fs.readFile(getCachePath(), 'utf-8');
  return JSON.parse(content) as ProviderRegistryData;
}

/**
 * 从 LiteLLM 的 model_prices_and_context_window.json 转换数据
 *
 * LiteLLM 的数据结构包含所有 provider 的模型信息
 * 格式: { "model_name": { "litellm_params": { "model": "provider/model" }, ... } }
 */
function transformLiteLLMData(raw: Record<string, unknown>): ProviderRegistryData {
  const providers: Record<string, {
    id: string;
    name: string;
    npm: string;
    base_url?: string;
    models: Record<string, {
      id: string;
      name: string;
      max_tokens?: number;
      supports_tools?: boolean;
      supports_vision?: boolean;
      supports_thinking?: boolean;
    }>;
  }> = {};

  // 预定义的 provider 信息
  const providerMeta: Record<string, { name: string; npm: string; base_url?: string }> = {
    anthropic: { name: 'Anthropic', npm: '@ai-sdk/anthropic' },
    openai: { name: 'OpenAI', npm: '@ai-sdk/openai' },
    google: { name: 'Google Gemini', npm: '@ai-sdk/google' },
    mistral: { name: 'Mistral AI', npm: '@ai-sdk/mistral' },
    cohere: { name: 'Cohere', npm: '@ai-sdk/cohere' },
    deepseek: { name: 'DeepSeek', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.deepseek.com/v1' },
    openrouter: { name: 'OpenRouter', npm: '@ai-sdk/openai-compatible', base_url: 'https://openrouter.ai/api/v1' },
    moonshot: { name: 'Moonshot (Kimi)', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.moonshot.cn/v1' },
    minimax: { name: 'MiniMax', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.minimax.chat/v1' },
    zhipu: { name: '智谱 AI', npm: '@ai-sdk/openai-compatible', base_url: 'https://open.bigmodel.cn/api/paas/v4' },
    qwen: { name: '阿里云通义千问', npm: '@ai-sdk/openai-compatible', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    doubao: { name: '豆包 (字节跳动)', npm: '@ai-sdk/openai-compatible', base_url: 'https://ark.cn-beijing.volces.com/api/v3' },
    yi: { name: '零一万物 (Yi)', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.lingyiwanwu.com/v1' },
    baichuan: { name: '百川智能', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.baichuan-ai.com/v1' },
    baidu: { name: '百度文心一言', npm: '@ai-sdk/openai-compatible', base_url: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop' },
    stepfun: { name: '阶跃星辰 (Step)', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.stepfun.com/v1' },
    groq: { name: 'Groq', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.groq.com/openai/v1' },
    xai: { name: 'xAI (Grok)', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.x.ai/v1' },
    perplexity: { name: 'Perplexity AI', npm: '@ai-sdk/openai-compatible', base_url: 'https://api.perplexity.ai' },
  };

  // 解析 LiteLLM 数据，提取 provider 和 model 信息
  for (const [modelName, modelData] of Object.entries(raw)) {
    if (!modelData || typeof modelData !== 'object') continue;

    const data = modelData as Record<string, unknown>;
    const litellmParams = data['litellm_params'] as Record<string, unknown> | undefined;

    if (!litellmParams?.['model']) continue;

    const fullModel = String(litellmParams['model']);
    // 解析 "provider/model" 格式
    const [providerId, modelId] = fullModel.includes('/')
      ? fullModel.split('/')
      : ['openai', fullModel];

    // 初始化 provider
    if (!providers[providerId]) {
      const meta = providerMeta[providerId] || {
        name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
        npm: '@ai-sdk/openai-compatible',
      };
      providers[providerId] = {
        id: providerId,
        name: meta.name,
        npm: meta.npm,
        base_url: meta.base_url,
        models: {},
      };
    }

    // 提取模型信息
    const maxInputTokens = data['max_input_tokens'] as number | undefined;
    const maxOutputTokens = data['max_output_tokens'] as number | undefined;
    const supportsFunctionCalling = data['supports_function_calling'] as boolean | undefined;
    const supportsVision = data['supports_vision'] as boolean | undefined;

    providers[providerId].models[modelId || modelName] = {
      id: modelId || modelName,
      name: modelName,
      max_tokens: maxOutputTokens || maxInputTokens,
      supports_tools: supportsFunctionCalling,
      supports_vision: supportsVision,
    };
  }

  return {
    version: `litellm-${new Date().toISOString().split('T')[0]}`,
    synced_at: new Date().toISOString(),
    providers,
  };
}

/**
 * 从网络同步 Provider 元数据
 */
async function fetchFromNetwork(): Promise<ProviderRegistryData | null> {
  try {
    const response = await fetch(MODELS_DEV_URL, {
      headers: { 'Accept': 'application/json' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Bun fetch API
      signal: AbortSignal.timeout(10000) as any,
    });

    if (!response.ok) {
      console.error(`Network sync failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const raw = await response.json() as Record<string, unknown>;
    return transformLiteLLMData(raw);
  } catch (err) {
    console.error(`Network sync error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * 同步 Provider 元数据
 *
 * 策略:
 * 1. 检查缓存有效性（24小时 TTL）
 * 2. 缓存有效 → 直接使用缓存
 * 3. 缓存过期/不存在 → 尝试网络同步
 * 4. 网络失败 → 使用内置 fallback
 *
 * @param force - 强制刷新缓存
 */
export async function syncProviders(force = false): Promise<ProviderRegistryData> {
  // 1. 检查缓存有效性
  if (!force && await isCacheValid()) {
    try {
      return await loadCache();
    } catch {
      // 缓存损坏，继续同步
    }
  }

  // 2. 尝试网络同步
  const networkData = await fetchFromNetwork();
  if (networkData && Object.keys(networkData.providers).length > 0) {
    await saveCache(networkData);
    return networkData;
  }

  // 3. 使用 fallback 并保存缓存
  await saveCache(FALLBACK_PROVIDERS);
  return FALLBACK_PROVIDERS;
}