import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import Parser from 'web-tree-sitter';
import { WASM_CDN_URL, WASM_FILE_MAP, PARSER_CACHE_DIR } from './constants';
import { LANGUAGE_TO_PARSER } from './language-map';
import { logger } from '@open-zread/utils';

// Cache for loaded languages
const languageCache = new Map<string, Parser.Language>();

// Get local cache path
function getLocalCachePath(): string {
  return PARSER_CACHE_DIR.replace('~', homedir());
}

// Ensure WASM cache directory exists
function ensureCacheDir(): void {
  const cacheDir = getLocalCachePath();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

// Download WASM file
async function downloadWasm(parserName: string): Promise<Uint8Array> {
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
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    throw new Error(`WASM download failed: ${parserName}\nPlease manually download to ~/.zread/parsers/`);
  }
}

// Load language (returns Parser.Language)
export async function loadLanguage(parserName: string): Promise<Parser.Language> {
  // Check cache
  if (languageCache.has(parserName)) {
    return languageCache.get(parserName)!;
  }

  ensureCacheDir();
  const cacheDir = getLocalCachePath();
  const wasmPath = join(cacheDir, WASM_FILE_MAP[parserName]);

  let wasmBuffer: Uint8Array;

  // Check local cache
  if (existsSync(wasmPath)) {
    logger.info(`Using local cache: ${parserName}`);
    const fileBuffer = readFileSync(wasmPath);
    wasmBuffer = new Uint8Array(fileBuffer);
  } else {
    // Download and cache
    wasmBuffer = await downloadWasm(parserName);
    writeFileSync(wasmPath, Buffer.from(wasmBuffer));
    logger.success(`WASM cached: ${parserName}`);
  }

  // Initialize Parser
  await Parser.init();
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
        logger.warn(`Parser load failed: ${lang}`);
      }
    }
  }

  return parsers;
}

// Get cached language (for special scenarios)
export function getCachedLanguage(parserName: string): Parser.Language | undefined {
  return languageCache.get(parserName);
}