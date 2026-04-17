import { join, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import Parser from 'web-tree-sitter';
import { WASM_CDN_URL, WASM_FILE_MAP } from './constants';
import { LANGUAGE_TO_PARSER } from './language-map';
import { logger } from '@open-zread/utils';

const languageCache = new Map<string, Parser.Language>();

let parserInitialized = false;

function getLocalCachePath(): string {
  return join(homedir(), '.zread', 'parsers');
}

function ensureCacheDir(): void {
  const cacheDir = getLocalCachePath();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

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

function getTreeSitterDir(): string {
  try {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    if (existsSync(join(scriptDir, 'tree-sitter.wasm'))) {
      return scriptDir;
    }
  } catch {
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
  const __filename = fileURLToPath(import.meta.url);
  return join(dirname(__filename), '..', '..', '..', '..', 'node_modules', '.pnpm', 'web-tree-sitter@0.20.8', 'node_modules', 'web-tree-sitter');
}

async function initParser(): Promise<void> {
  const treeSitterDir = getTreeSitterDir();

  await Parser.init({
    locateFile: (fileName: string) => {
      return join(treeSitterDir, fileName);
    }
  });
}

export async function loadLanguage(parserName: string): Promise<Parser.Language> {
  if (languageCache.has(parserName)) {
    const cached = languageCache.get(parserName);
    if (cached) return cached;
  }

  if (!parserInitialized) {
    await initParser();
    parserInitialized = true;
  }

  ensureCacheDir();

  let wasmBuffer: Uint8Array;
  const cached = loadWasmFromCache(parserName);
  if (cached) {
    wasmBuffer = cached;
  } else {
    wasmBuffer = await downloadWasmToCache(parserName);
  }

  const language = await Parser.Language.load(wasmBuffer);

  languageCache.set(parserName, language);

  return language;
}

export async function loadParser(parserName: string): Promise<Parser> {
  const language = await loadLanguage(parserName);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}

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

export function getCachedLanguage(parserName: string): Parser.Language | undefined {
  return languageCache.get(parserName);
}
