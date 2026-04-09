import type { FileManifest, TechStackSummary, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse } from './llm-client';
import { logger } from '@open-zread/utils';

const SYSTEM_PROMPT = `You are a tech stack analysis expert. Analyze project file structure to identify tech stack, framework type, and entry points.
Output must be JSON format.`;

const USER_PROMPT_TEMPLATE = `Analyze the following file list to identify project tech stack:

Total Files: {totalFiles}
Language Distribution: {languageStats}
File List (First 50):
{fileList}

Output JSON format:
{
  "techStack": {
    "languages": ["..."],
    "frameworks": ["..."],
    "buildTools": ["..."]
  },
  "projectType": "...",
  "entryPoints": ["..."]
}`;

// Build language statistics
function buildLanguageStats(manifest: FileManifest): string {
  const stats: Record<string, number> = {};
  for (const file of manifest.files) {
    stats[file.language] = (stats[file.language] || 0) + 1;
  }
  return Object.entries(stats)
    .map(([lang, count]) => `${lang}: ${count}`)
    .join(', ');
}

// ScanAgent
export async function runScanAgent(
  manifest: FileManifest,
  config: AppConfig
): Promise<TechStackSummary> {
  logger.progress('ScanAgent: Identifying tech stack');

  const languageStats = buildLanguageStats(manifest);
  const fileList = manifest.files
    .slice(0, 50)
    .map(f => f.path)
    .join('\n');

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{totalFiles}', manifest.totalFiles.toString())
    .replace('{languageStats}', languageStats)
    .replace('{fileList}', fileList);

  const response = await callLLM(config, prompt, SYSTEM_PROMPT);
  const result = parseJsonResponse(response) as TechStackSummary;

  logger.success('ScanAgent: Tech stack identified');
  return result;
}