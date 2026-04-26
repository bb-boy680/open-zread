import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, content, 'utf-8');
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeTextFile(path, content);
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

export function joinPath(...parts: string[]): string {
  return join(...parts);
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function getOutputDir(): string {
  return join(getProjectRoot(), '.open-zread');
}

export function getDraftsDir(): string {
  return join(getOutputDir(), 'drafts');
}

export function getCacheDir(): string {
  return join(getOutputDir(), 'cache');
}

export function getWikiDir(): string {
  return join(getOutputDir(), 'wiki');
}
