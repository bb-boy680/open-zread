import type { FileManifest, TechStackSummary, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse, appendAgentLog } from './llm-client';
import { scanPrompt, fillPrompt } from '../prompts/agents-prompts';
import { logger, getProjectRoot } from '@open-zread/core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function buildLanguageStats(manifest: FileManifest): string {
  const stats: Record<string, number> = {};
  for (const file of manifest.files) {
    stats[file.language] = (stats[file.language] || 0) + 1;
  }
  return Object.entries(stats)
    .map(([lang, count]) => `${lang}: ${count}`)
    .join(', ');
}

function readCoreConfigs(projectRoot: string): string {
  const configFiles = [
    'package.json',
    'go.mod',
    'pyproject.toml',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'CMakeLists.txt',
    'composer.json',
    'Gemfile',
    'tsconfig.json',
    'Makefile',
  ];

  const results: string[] = [];
  for (const file of configFiles) {
    const fullPath = join(projectRoot, file);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const truncated = content.length > 2000 ? content.slice(0, 2000) + '\n... (truncated)' : content;
        results.push(`=== ${file} ===\n${truncated}`);
      } catch {
        // Read failed, skip
      }
    }
  }
  return results.length > 0 ? results.join('\n\n') : '(No core config files found)';
}

export async function runScanAgent(
  manifest: FileManifest,
  config: AppConfig
): Promise<TechStackSummary> {
  logger.progress('ScanAgent: Identifying tech stack');

  const projectRoot = getProjectRoot();
  const languageStats = buildLanguageStats(manifest);
  const fileList = manifest.files
    .slice(0, 50)
    .map(f => f.path)
    .join('\n');
  const coreConfigs = readCoreConfigs(projectRoot);

  const prompt = fillPrompt(scanPrompt.user, {
    totalFiles: manifest.totalFiles.toString(),
    languageStats: languageStats,
    fileList: fileList,
    coreConfigs: coreConfigs,
  });

  const response = await callLLM(config, prompt, scanPrompt.system);
  const result = parseJsonResponse(response) as TechStackSummary;

  logger.info(`  Project type: ${result.projectType}`);
  logger.info(`  Languages: ${result.techStack.languages.join(', ')}`);
  logger.info(`  Frameworks: ${result.techStack.frameworks.join(', ')}`);
  logger.info(`  Build tools: ${result.techStack.buildTools.join(', ')}`);
  logger.info(`  Entry points: ${result.entryPoints.join(', ')}`);
  appendAgentLog(`[ScanAgent Result] ${JSON.stringify(result, null, 2)}`);

  logger.success('ScanAgent: Tech stack identified');
  return result;
}
