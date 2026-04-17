/**
 * Configuration Types
 *
 * Application configuration structure
 */

/**
 * AppConfig - Configuration
 */
export interface AppConfig {
  language: string;
  doc_language: string;
  llm: {
    provider: string;
    model: string;
    api_key: string;
    base_url: string;
  };
  concurrency: {
    max_concurrent: number;
    max_retries: number;
  };
}