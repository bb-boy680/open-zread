import type { WikiOutput, WikiPage, AppConfig, TechStackSummary } from '@open-zread/types';
import { getDraftsDir, ensureDir, writeJsonFile, joinPath } from '../file-io.js';
import { logger } from '../logger.js';
import { OUTPUT_FILES } from './constants';

function generateWikiId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `${dateStr}-${timeStr}`;
}

export async function generateWikiJson(
  pages: WikiPage[],
  config: AppConfig,
  techStackSummary?: TechStackSummary
): Promise<string> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  const wikiOutput: WikiOutput = {
    id: generateWikiId(),
    generated_at: new Date().toISOString(),
    language: config.language,
    pages,
    techStackSummary,
  };

  const outputPath = joinPath(draftsDir, OUTPUT_FILES.wiki);
  await writeJsonFile(outputPath, wikiOutput);

  logger.success(`Blueprint generated: ${outputPath}`);
  return outputPath;
}
