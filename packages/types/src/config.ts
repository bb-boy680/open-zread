/**
 * Configuration Types
 *
 * Application configuration structure
 */

/**
 * AppConfig - Configuration
 */
/**
 * LLMConfig - LLM Provider Configuration
 *
 * 部分字段可为 null，表示待配置状态
 */
export interface LLMConfig {
  provider: string | null;
  model: string | null;
  api_key: string | null;
  base_url: string | null;
}

/**
 * AppConfig - Configuration
 */
export interface AppConfig {
  language: string;
  doc_language: string;
  llm: LLMConfig;
  concurrency: {
    max_concurrent: number;
    max_retries: number;
  };
}