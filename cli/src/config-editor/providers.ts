/**
 * LLM Provider Presets
 * Each preset maps to a provider value and base_url.
 */

export interface ProviderPreset {
  label: string;
  value: string;
  baseUrl: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { label: 'BigModel.cn Coding Plan (CN)', value: 'bigmodel-coding-cn', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { label: 'Z.AI Coding Plan (Non-CN)', value: 'zai-coding-noncn', baseUrl: 'https://api.z.ai/api/paas/v4' },
  { label: 'BigModel.cn (CN)', value: 'bigmodel-cn', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { label: 'Z.AI (Non-CN)', value: 'zai-noncn', baseUrl: 'https://api.z.ai/api/paas/v4' },
  { label: 'OpenAI', value: 'openai', baseUrl: 'https://api.openai.com/v1' },
  { label: 'OpenRouter', value: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Moonshot(Kimi)', value: 'moonshot', baseUrl: 'https://api.moonshot.cn/v1' },
  { label: 'MiniMax', value: 'minimax', baseUrl: 'https://api.minimax.chat/v1' },
  { label: '自定义', value: 'custom', baseUrl: '' },
];
