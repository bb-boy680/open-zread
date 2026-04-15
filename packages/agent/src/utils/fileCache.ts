/**
 * File State LRU Cache
 *
 * Bounded cache for file contents with path normalization.
 * Used to track file states for compaction diffs and
 * avoiding redundant reads.
 */

import { normalize, resolve } from 'path'

/**
 * Cached file state.
 */
export interface FileState {
  content: string
  timestamp: number
  offset?: number
  limit?: number
  isPartialView?: boolean
}

/**
 * LRU file state cache with size limits.
 */
export class FileStateCache {
  private cache = new Map<string, FileState>()
  private maxEntries: number
  private maxSizeBytes: number
  private currentSizeBytes = 0

  constructor(maxEntries: number = 100, maxSizeBytes: number = 25 * 1024 * 1024) {
    this.maxEntries = maxEntries
    this.maxSizeBytes = maxSizeBytes
  }

  /**
   * Normalize a file path for cache lookup.
   */
  private normalizePath(filePath: string): string {
    return normalize(resolve(filePath))
  }

  /**
   * Get a cached file state.
   */
  get(filePath: string): FileState | undefined {
    const key = this.normalizePath(filePath)
    const entry = this.cache.get(key)
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, entry)
    }
    return entry
  }

  /**
   * Set a cached file state.
   */
  set(filePath: string, state: FileState): void {
    const key = this.normalizePath(filePath)

    // Remove old entry if exists
    const old = this.cache.get(key)
    if (old) {
      this.currentSizeBytes -= Buffer.byteLength(old.content, 'utf-8')
      this.cache.delete(key)
    }

    const newSize = Buffer.byteLength(state.content, 'utf-8')

    // Evict entries if necessary
    while (
      (this.cache.size >= this.maxEntries || this.currentSizeBytes + newSize > this.maxSizeBytes) &&
      this.cache.size > 0
    ) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        const entry = this.cache.get(firstKey)
        if (entry) {
          this.currentSizeBytes -= Buffer.byteLength(entry.content, 'utf-8')
        }
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, state)
    this.currentSizeBytes += newSize
  }

  /**
   * Delete a cached entry.
   */
  delete(filePath: string): boolean {
    const key = this.normalizePath(filePath)
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSizeBytes -= Buffer.byteLength(entry.content, 'utf-8')
      this.cache.delete(key)
      return true
    }
    return false
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear()
    this.currentSizeBytes = 0
  }

  /**
   * Get the number of cached entries.
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get all cached file paths.
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Clone the cache.
   */
  clone(): FileStateCache {
    const clone = new FileStateCache(this.maxEntries, this.maxSizeBytes)
    for (const [key, value] of this.cache) {
      clone.cache.set(key, { ...value })
    }
    clone.currentSizeBytes = this.currentSizeBytes
    return clone
  }
}

/**
 * Create a file state cache with default limits.
 */
export function createFileStateCache(
  maxEntries: number = 100,
  maxSizeBytes: number = 25 * 1024 * 1024,
): FileStateCache {
  return new FileStateCache(maxEntries, maxSizeBytes)
}
