import { join } from 'path';
import type { FileManifest, CacheManifest, DehydratedSkeleton } from '@open-zread/types';
import { getCacheDir, readJsonFile, writeJsonFile, ensureDir } from '@open-zread/utils';
import { CACHE_FILES, CACHE_VERSION } from './constants';

// Load cached manifest
export async function loadCachedManifest(): Promise<CacheManifest | null> {
  const cacheDir = getCacheDir();
  const manifestPath = join(cacheDir, CACHE_FILES.manifest);

  try {
    return await readJsonFile<CacheManifest>(manifestPath);
  } catch {
    return null;
  }
}

// Save manifest to cache
export async function saveCachedManifest(manifest: FileManifest): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureDir(cacheDir);

  const cacheManifest: CacheManifest = {
    version: CACHE_VERSION,
    generated_at: new Date().toISOString(),
    files: manifest.files.map(f => ({
      path: f.path,
      hash: f.hash,
      size: f.size,
    })),
  };

  const manifestPath = join(cacheDir, CACHE_FILES.manifest);
  await writeJsonFile(manifestPath, cacheManifest);
}

// Load cached skeleton
export async function loadCachedSkeleton(): Promise<DehydratedSkeleton | null> {
  const cacheDir = getCacheDir();
  const skeletonPath = join(cacheDir, CACHE_FILES.skeleton);

  try {
    return await readJsonFile<DehydratedSkeleton>(skeletonPath);
  } catch {
    return null;
  }
}

// Save skeleton to cache
export async function saveCachedSkeleton(skeleton: DehydratedSkeleton): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureDir(cacheDir);

  const skeletonPath = join(cacheDir, CACHE_FILES.skeleton);
  await writeJsonFile(skeletonPath, skeleton);
}

// Compare two manifests, find changed files
export function diffManifests(
  cached: CacheManifest,
  current: FileManifest
): { added: string[]; modified: string[]; removed: string[] } {
  const cachedMap = new Map(cached.files.map(f => [f.path, f.hash]));
  const currentMap = new Map(current.files.map(f => [f.path, f.hash]));

  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  // Check for added and modified
  for (const [path, hash] of currentMap) {
    if (!cachedMap.has(path)) {
      added.push(path);
    } else if (cachedMap.get(path) !== hash) {
      modified.push(path);
    }
  }

  // Check for removed
  for (const [path] of cachedMap) {
    if (!currentMap.has(path)) {
      removed.push(path);
    }
  }

  return { added, modified, removed };
}

// Check if reprocessing is needed
export function needsReprocess(
  cached: CacheManifest | null,
  current: FileManifest
): boolean {
  if (!cached) return true;

  const diff = diffManifests(cached, current);
  return diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0;
}