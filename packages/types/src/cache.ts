/**
 * Cache Types
 *
 * Cache manifest structure for incremental processing
 */

/**
 * CacheManifest - Cache manifest
 */
export interface CacheManifest {
  version: string;
  generated_at: string;
  promptHash?: string;
  files: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
}