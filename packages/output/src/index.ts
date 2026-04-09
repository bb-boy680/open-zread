import type { WikiOutput, WikiPage, AppConfig } from '@open-zread/types';
import { getDraftsDir, ensureDir, writeJsonFile, joinPath, logger } from '@open-zread/utils';
import { OUTPUT_FILES } from './constants';

// Generate Wiki ID
function generateWikiId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `${dateStr}-${timeStr}`;
}

// Generate wiki.json
export async function generateWikiJson(
  pages: WikiPage[],
  config: AppConfig
): Promise<string> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  const wikiOutput: WikiOutput = {
    id: generateWikiId(),
    generated_at: new Date().toISOString(),
    language: config.language,
    pages,
  };

  const outputPath = joinPath(draftsDir, OUTPUT_FILES.wiki);
  await writeJsonFile(outputPath, wikiOutput);

  logger.success(`Blueprint generated: ${outputPath}`);
  return outputPath;
}