import { readFile, writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse, stringify } from 'yaml';
import type { AppConfig } from '@open-zread/types';

const CONFIG_PATH = join(homedir(), '.zread', 'config.yaml');

/**
 * 默认配置 - 首次使用时的初始配置
 */
export const DEFAULT_CONFIG: AppConfig = {
  language: 'en',
  doc_language: 'en',
  llm: {
    provider: null,
    model: null,
    api_key: null,
    base_url: null,
  },
  concurrency: {
    max_concurrent: 1,
    max_retries: 0,  // 默认不重试，用户可配置
  },
};

export function getConfigPath(): string {
  return CONFIG_PATH;
}

/**
 * 检查配置是否为首次配置（LLM 未配置）
 */
export function isFirstTimeConfig(config: AppConfig): boolean {
  return config.llm.api_key === null;
}

export async function loadConfig(): Promise<AppConfig> {
  // 配置文件不存在，返回默认配置
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const rawConfig = parse(content);
    return validateConfig(rawConfig);
  } catch (error) {
    throw new Error(`Config file read failed: ${CONFIG_PATH}\nPlease ensure config file exists and format is correct`, { cause: error });
  }
}

/**
 * 同步加载配置（用于 CLI 启动时获取语言设置）
 */
export function loadConfigSync(): AppConfig | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const rawConfig = parse(content);
    return validateConfig(rawConfig);
  } catch {
    return null;
  }
}

export function validateConfig(raw: unknown): AppConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_CONFIG;
  }

  const config = raw as Record<string, unknown>;

  // 必需的顶级字段
  if (!config.language || !config.doc_language || !config.concurrency) {
    return DEFAULT_CONFIG;
  }

  // concurrency 字段验证
  const concurrency = config.concurrency as Record<string, unknown>;
  if (typeof concurrency.max_concurrent !== 'number' || typeof concurrency.max_retries !== 'number') {
    return DEFAULT_CONFIG;
  }

  // llm 字段验证（允许 null，表示待配置）
  const llm = (config.llm as Record<string, unknown>) || {
    provider: null,
    model: null,
    api_key: null,
    base_url: null,
  };

  return {
    language: config.language as string,
    doc_language: config.doc_language as string,
    llm: {
      provider: llm.provider as string | null,
      model: llm.model as string | null,
      api_key: llm.api_key as string | null,
      base_url: llm.base_url as string | null,
    },
    concurrency: {
      max_concurrent: concurrency.max_concurrent as number,
      max_retries: concurrency.max_retries as number,
    },
  };
}

export async function saveConfig(config: AppConfig): Promise<void> {
  validateConfig(config);
  const yamlContent = stringify(config);
  await writeFile(CONFIG_PATH, yamlContent, 'utf-8');
}

export function getDefaultLanguage(config: AppConfig): string {
  return config.language || config.doc_language || 'zh';
}
