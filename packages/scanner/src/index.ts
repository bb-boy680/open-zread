import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, relative, resolve, dirname } from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import Ignore, { type Ignore as IgnoreType } from 'ignore';
import type { FileManifest, FileInfo } from '@open-zread/types';
import { logger, getProjectRoot } from '@open-zread/utils';
import { SCANNER_CONFIG, LANGUAGE_MAP } from './constants';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Language detection
function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'unknown';
}

// Create ignore filter
async function createIgnoreFilter(projectRoot: string): Promise<IgnoreType> {
  const ig = Ignore();

  // Add default ignore rules
  SCANNER_CONFIG.ignore_patterns.forEach(pattern => ig.add(pattern));

  // Try reading .gitignore
  try {
    const gitignorePath = join(projectRoot, '.gitignore');
    const gitignoreContent = await readFile(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  } catch {
    // .gitignore not found, ignore
  }

  return ig;
}

// Worker thread pool Hash calculation
function calculateHashWithWorker(
  filePaths: string[],
  maxWorkers: number = SCANNER_CONFIG.max_workers
): Promise<Map<string, string>> {
  return new Promise((resolvePromise, reject) => {
    const results = new Map<string, string>();
    const queue = [...filePaths];
    let activeWorkers = 0;
    let currentIndex = 0;

    const processNext = () => {
      if (currentIndex >= queue.length && activeWorkers === 0) {
        resolvePromise(results);
        return;
      }

      while (activeWorkers < maxWorkers && currentIndex < queue.length) {
        const filePath = queue[currentIndex++];
        activeWorkers++;

        const worker = new Worker(join(__dirname, 'worker.js'));

        worker.on('message', (result: { filePath: string; hash: string; error?: string }) => {
          if (result.hash) {
            results.set(result.filePath, result.hash);
          }
          activeWorkers--;
          worker.terminate();
          processNext();
        });

        worker.on('error', (error) => {
          logger.warn(`Worker error: ${error.message}`);
          activeWorkers--;
          worker.terminate();
          processNext();
        });

        worker.postMessage({ filePath });
      }
    };

    processNext();
  });
}

// Recursively scan directory (only collect file paths, don't calculate Hash)
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

    // Check if ignored
    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      const subFiles = await collectFiles(fullPath, projectRoot, ig);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const fileStat = await stat(fullPath);

      // Check file size limit
      if (fileStat.size > SCANNER_CONFIG.max_file_size) {
        logger.warn(`File too large, skipped: ${relativePath} (${fileStat.size} bytes)`);
        continue;
      }

      // Check language support
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

// Main scan function (uses Worker thread pool for Hash calculation)
export async function scanFiles(projectRoot?: string): Promise<FileManifest> {
  const root = projectRoot || getProjectRoot();
  logger.progress('Scanning project', root);

  // Step 1: Collect file info (main thread, no Hash calculation)
  const ig = await createIgnoreFilter(root);
  const collectedFiles = await collectFiles(root, root, ig);

  if (collectedFiles.length === 0) {
    return { files: [], totalFiles: 0, totalSize: 0 };
  }

  logger.progress('Calculating file hash', `${collectedFiles.length} files`);

  // Step 2: Use Worker thread pool for Hash calculation
  const projectRootResolved = resolve(root);
  const filePaths = collectedFiles.map(f => join(projectRootResolved, f.path));
  const hashMap = await calculateHashWithWorker(filePaths);

  // Step 3: Assemble final results
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

// Export constants
export { SCANNER_CONFIG, LANGUAGE_MAP };