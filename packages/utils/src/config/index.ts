import { readFile, writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse, stringify } from 'yaml';
import type { AppConfig } from '@open-zread/types';

const CONFIG_PATH = join(homedir(), '.zread', 'config.yaml');

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export async function loadConfig(): Promise<AppConfig> {
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
    throw new Error('Config format error');
  }

  const config = raw as Record<string, unknown>;

  const required = ['language', 'doc_language', 'llm', 'concurrency'];
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Missing required config: ${field}`);
    }
  }

  const llm = config.llm as Record<string, unknown>;
  if (!llm.provider || !llm.model || !llm.api_key || !llm.base_url) {
    throw new Error('LLM config incomplete');
  }

  const concurrency = config.concurrency as Record<string, unknown>;
  if (typeof concurrency.max_concurrent !== 'number' || typeof concurrency.max_retries !== 'number') {
    throw new Error('Concurrency config format error');
  }

  return {
    language: config.language as string,
    doc_language: config.doc_language as string,
    llm: {
      provider: llm.provider as string,
      model: llm.model as string,
      api_key: llm.api_key as string,
      base_url: llm.base_url as string,
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
