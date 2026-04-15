import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, relative, resolve } from 'path';
import Ignore, { type Ignore as IgnoreType } from 'ignore';
import { createHash } from 'crypto';
import type { FileManifest, FileInfo } from '@open-zread/types';
import { logger, getProjectRoot } from '@open-zread/core';
import { SCANNER_CONFIG, LANGUAGE_MAP } from './constants';

function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'unknown';
}

async function createIgnoreFilter(projectRoot: string): Promise<IgnoreType> {
  const ig = Ignore();

  SCANNER_CONFIG.ignore_patterns.forEach(pattern => ig.add(pattern));

  try {
    const gitignorePath = join(projectRoot, '.gitignore');
    const gitignoreContent = await readFile(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  } catch {
    // .gitignore not found, ignore
  }

  return ig;
}

async function calculateHashes(filePaths: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const filePath of filePaths) {
    try {
      const content = await readFile(filePath);
      const hash = createHash('md5').update(content).digest('hex').slice(0, 12);
      results.set(filePath, hash);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to hash ${filePath}: ${message}`);
    }
  }

  return results;
}

async function collectFiles(
  dir: string,
  projectRoot: string,
  ig: IgnoreType
): Promise<Array<{ path: string; size: number; language: string; lastModified: string }>> {
  const files: Array<{ path: string; size: number; language: string; lastModified: string }> = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(projectRoot, fullPath);

    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, projectRoot, ig);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const fileStat = await stat(fullPath);

      if (fileStat.size > SCANNER_CONFIG.max_file_size) {
        logger.warn(`File too large, skipped: ${relativePath} (${fileStat.size} bytes)`);
        continue;
      }

      const language = detectLanguage(fullPath);
      if (language === 'unknown') {
        continue;
      }

      files.push({
        path: relativePath,
        size: fileStat.size,
        language,
        lastModified: fileStat.mtime.toISOString(),
      });
    }
  }

  return files;
}

export async function scanFiles(projectRoot?: string): Promise<FileManifest> {
  const root = projectRoot || getProjectRoot();
  logger.progress('Scanning project', root);

  const ig = await createIgnoreFilter(root);
  const collectedFiles = await collectFiles(root, root, ig);

  if (collectedFiles.length === 0) {
    return { files: [], totalFiles: 0, totalSize: 0 };
  }

  logger.progress('Calculating file hash', `${collectedFiles.length} files`);

  const projectRootResolved = resolve(root);
  const filePaths = collectedFiles.map(f => join(projectRootResolved, f.path));
  const hashMap = await calculateHashes(filePaths);

  const files: FileInfo[] = collectedFiles.map(f => ({
    path: f.path,
    hash: hashMap.get(join(projectRootResolved, f.path)) || '',
    size: f.size,
    language: f.language,
    lastModified: f.lastModified,
  }));

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  logger.success(`Scanned ${files.length} files (${totalSize} bytes)`);

  return {
    files,
    totalFiles: files.length,
    totalSize,
  };
}

export { SCANNER_CONFIG, LANGUAGE_MAP };
