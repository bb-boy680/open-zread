/**
 * Wiki Content Utilities
 *
 * Functions for generating and loading Wiki blueprint.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { WikiOutput, WikiPage, AppConfig, TechStackSummary } from '@open-zread/types';
import { getWikiDir, getWikiJsonPath, writeJsonFile } from '../file-io.js';
import { logger } from '../logger.js';

const DEFAULT_BLUEPRINT_FILE = 'wiki.json';

function generateWikiId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `${dateStr}-${timeStr}`;
}

/**
 * Generate Wiki Blueprint
 *
 * Generate wiki.json blueprint and save to wiki directory.
 */
export async function generateWikiJson(
  pages: WikiPage[],
  config: AppConfig,
  techStackSummary?: TechStackSummary
): Promise<string> {
  const wikiOutput: WikiOutput = {
    id: generateWikiId(),
    generated_at: new Date().toISOString(),
    language: config.language,
    pages,
    techStackSummary,
  };

  const outputPath = getWikiJsonPath();
  await writeJsonFile(outputPath, wikiOutput);

  logger.success(`Blueprint generated: ${outputPath}`);
  return outputPath;
}

/**
 * Load Wiki Blueprint
 *
 * Load wiki.json from wiki directory.
 *
 * @param path - Optional custom path (defaults to .open-zread/wiki/wiki.json)
 * @returns WikiOutput with pages array
 * @throws Error if blueprint not found or invalid structure
 */
export async function loadWikiBlueprint(path?: string): Promise<WikiOutput> {
  const wikiDir = getWikiDir();
  const blueprintPath = path ?? join(wikiDir, DEFAULT_BLUEPRINT_FILE);

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