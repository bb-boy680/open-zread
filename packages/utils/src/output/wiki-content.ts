/**
 * Wiki Content Utilities
 *
 * Functions for loading Wiki blueprint.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDraftsDir } from '../file-io.js';
import type { WikiOutput } from '@open-zread/types';

const DEFAULT_BLUEPRINT_FILE = 'wiki.json';

/**
 * Load Wiki Blueprint
 *
 * Load wiki.json from drafts directory.
 *
 * @param path - Optional custom path (defaults to .open-zread/drafts/wiki.json)
 * @returns WikiOutput with pages array
 * @throws Error if blueprint not found or invalid structure
 */
export async function loadWikiBlueprint(path?: string): Promise<WikiOutput> {
  const draftsDir = getDraftsDir();
  const blueprintPath = path ?? join(draftsDir, DEFAULT_BLUEPRINT_FILE);

  try {
    const content = await readFile(blueprintPath, 'utf-8');
    const blueprint = JSON.parse(content) as WikiOutput;

    // Validate blueprint structure
    if (!blueprint.pages || !Array.isArray(blueprint.pages)) {
      throw new Error('蓝图缺少 pages 字段或格式无效');
    }

    if (blueprint.pages.length === 0) {
      throw new Error('蓝图 pages 数组为空');
    }

    return blueprint;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`加载蓝图失败: ${blueprintPath}\n${message}`, { cause: err });
  }
}