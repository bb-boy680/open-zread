/**
 * Symbol Manifest Cache - Save/Load SymbolManifest for Repo Map Builder
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { SymbolManifest } from '@open-zread/types';
import { getCacheDir, ensureDir } from '../file-io.js';

const SYMBOL_CACHE_FILE = 'last_symbols.json';

/**
 * Save SymbolManifest to cache
 */
export async function saveCachedSymbols(symbols: SymbolManifest): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureDir(cacheDir);

  const cachePath = join(cacheDir, SYMBOL_CACHE_FILE);

  const cacheData = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    symbols: symbols.symbols,
    loadedParsers: symbols.loadedParsers,
  };

  await writeFile(cachePath, JSON.stringify(cacheData, null, 2));
}

/**
 * Load cached SymbolManifest
 */
export async function loadCachedSymbols(): Promise<SymbolManifest | null> {
  const cacheDir = getCacheDir();
  const cachePath = join(cacheDir, SYMBOL_CACHE_FILE);

  try {
    const content = await readFile(cachePath, 'utf-8');
    const data = JSON.parse(content);

    return {
      symbols: data.symbols || [],
      loadedParsers: data.loadedParsers || [],
    };
  } catch {
    return null;
  }
}