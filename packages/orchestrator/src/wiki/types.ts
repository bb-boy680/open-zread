/**
 * Wiki Generation Types
 *
 * Types for Wiki content generation system.
 */

import type { WikiPage } from '@open-zread/types';

/**
 * Progress State
 *
 * Tracks generation progress for CLI display.
 */
export interface ProgressState {
  /** Total pages to generate */
  total: number;
  /** Completed pages */
  completed: number;
  /** Failed pages */
  failed: number;
  /** Pending pages */
  pending: number;
  /** Current page being processed */
  currentPage: WikiPage | null;
  /** Individual page results */
  results: PageResult[];
}

/**
 * Page Result
 *
 * Result of a single page generation.
 */
export interface PageResult {
  /** Page slug */
  slug: string;
  /** Success status */
  success: boolean;
  /** Output file path (if successful) */
  outputPath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Wiki Result
 *
 * Final result of Wiki content generation.
 */
export interface WikiResult {
  /** Total pages */
  total: number;
  /** Successfully generated pages */
  completed: number;
  /** Failed pages */
  failed: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Individual page results */
  results: PageResult[];
}

/**
 * Generate Wiki Content Options
 */
export interface GenerateWikiOptions {
  /** Blueprint file path (default: .open-zread/drafts/wiki.json) */
  blueprintPath?: string;
  /** Custom concurrency limit (overrides config) */
  maxConcurrent?: number;
  /** Progress callback for CLI display */
  onProgress?: (state: ProgressState) => void;
}