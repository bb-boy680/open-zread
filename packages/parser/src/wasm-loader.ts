import { join, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import Parser from 'web-tree-sitter';
import { WASM_CDN_URL, WASM_FILE_MAP } from './constants';
import { LANGUAGE_TO_PARSER } from './language-map';
import { logger } from '@open-zread/utils';

// Cache for loaded languages
const languageCache = new Map<string, Parser.Language>();

// Parser initialized flag
let parserInitialized = false;

// Get local cache path (use homedir to avoid Chinese path issues)
function getLocalCachePath(): string {
  // Always use ~/.zread/parsers to avoid encoding issues with project paths
  return join(homedir(), '.zread', 'parsers');
}

// Ensure WASM cache directory exists
function ensureCacheDir(): void {
  const cacheDir = getLocalCachePath();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

// Download WASM file to local cache
async function downloadWasmToCache(parserName: string): Promise<Uint8Array> {
  const wasmFile = WASM_FILE_MAP[parserName];
  if (!wasmFile) {
    throw new Error(`Unknown parser: ${parserName}`);
  }

  const url = `${WASM_CDN_URL}/${wasmFile}`;
  logger.info(`Downloading WASM: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const wasmBuffer = new Uint8Array(arrayBuffer);

    // Save to local cache
    ensureCacheDir();
    const cacheDir = getLocalCachePath();
    const wasmPath = join(cacheDir, wasmFile);
    writeFileSync(wasmPath, Buffer.from(wasmBuffer));
    logger.success(`WASM cached: ${parserName}`);

    return wasmBuffer;
  } catch (error) {
    throw new Error(`WASM download failed: ${parserName}\nPlease manually download to ~/.zread/parsers/`, { cause: error });
  }
}

// Load WASM from cache
function loadWasmFromCache(parserName: string): Uint8Array | null {
  const cacheDir = getLocalCachePath();
  const wasmFile = WASM_FILE_MAP[parserName];
  const wasmPath = join(cacheDir, wasmFile);

  if (existsSync(wasmPath)) {
    logger.info(`Using local cache: ${parserName}`);
    const fileBuffer = readFileSync(wasmPath);
    return new Uint8Array(fileBuffer);
  }

  return null;
}

// Get web-tree-sitter WASM directory at runtime (avoids bun build __dirname hardcoding)
function getTreeSitterDir(): string {
  // Use the directory of the running script (dist/) where tree-sitter.wasm is copied to
  // This avoids any node_modules path resolution issues, especially with pnpm and Chinese paths
  try {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    // If running from dist/, the WASM file is in the same directory
    if (existsSync(join(scriptDir, 'tree-sitter.wasm'))) {
      return scriptDir;
    }
  } catch {
    // ESM fallback: walk up from current file to find node_modules/web-tree-sitter
    const __filename = fileURLToPath(import.meta.url);
    let current = dirname(__filename);
    for (let i = 0; i < 10; i++) {
      const candidate = join(current, 'node_modules', 'web-tree-sitter');
      if (existsSync(join(candidate, 'tree-sitter.wasm'))) return candidate;
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  // Last resort: pnpm structure relative to this package
  const __filename = fileURLToPath(import.meta.url);
  return join(dirname(__filename), '..', '..', '..', '..', 'node_modules', '.pnpm', 'web-tree-sitter@0.20.8', 'node_modules', 'web-tree-sitter');
}

// Initialize Parser with custom locateFile to avoid path encoding issues
async function initParser(): Promise<void> {
  const treeSitterDir = getTreeSitterDir();

  await Parser.init({
    locateFile: (fileName: string) => {
      // Always return a clean path using the runtime-resolved directory
      return join(treeSitterDir, fileName);
    }
  });
}

// Load language (returns Parser.Language)
export async function loadLanguage(parserName: string): Promise<Parser.Language> {
  // Check memory cache
  if (languageCache.has(parserName)) {
    const cached = languageCache.get(parserName);
    if (cached) return cached;
  }

  // Initialize Parser (must be called once before any Language.load)
  if (!parserInitialized) {
    await initParser();
    parserInitialized = true;
  }

  ensureCacheDir();

  // Load WASM buffer (from cache or download)
  let wasmBuffer: Uint8Array;
  const cached = loadWasmFromCache(parserName);
  if (cached) {
    wasmBuffer = cached;
  } else {
    wasmBuffer = await downloadWasmToCache(parserName);
  }

  // Load language from ArrayBuffer (avoids path encoding issues)
  const language = await Parser.Language.load(wasmBuffer);

  // Store in memory cache
  languageCache.set(parserName, language);

  return language;
}

// Load parser (returns pre-configured Parser instance)
export async function loadParser(parserName: string): Promise<Parser> {
  const language = await loadLanguage(parserName);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

// Batch load parsers (returns Parser instance Map)
export async function loadParsers(languages: string[]): Promise<Map<string, Parser>> {
  const parsers = new Map<string, Parser>();

  for (const lang of languages) {
    const parserName = LANGUAGE_TO_PARSER[lang];
    if (parserName) {
      try {
        const parser = await loadParser(parserName);
        parsers.set(lang, parser);
      } catch (error) {
        logger.warn(`Parser load failed: ${lang} - ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  return parsers;
}

// Get cached language (for special scenarios)
export function getCachedLanguage(parserName: string): Parser.Language | undefined {
  return languageCache.get(parserName);
}