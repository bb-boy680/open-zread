import type { DehydratedSkeleton, TechStackSummary, CoreModules, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse, appendAgentLog } from './llm-client';
import { clusterPrompt, fillPrompt } from '../prompts/agents-prompts';
import { logger } from '@open-zread/core';

export async function runClusterAgent(
  skeleton: DehydratedSkeleton,
  techStack: TechStackSummary,
  config: AppConfig
): Promise<CoreModules> {
  logger.progress('ClusterAgent: Marking core modules');

  const highRefFiles = Object.entries(skeleton.referenceMap)
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([path, count]) => `${path}: ${count} refs`)
    .join('\n');

  const skeletonSummary = skeleton.skeleton
    .slice(0, 30)
    .map(s => `--- ${s.file} ---\n${s.content.slice(0, 300)}...`)
    .join('\n\n');

  const prompt = fillPrompt(clusterPrompt.user, {
    techStack: JSON.stringify(techStack.techStack),
    referenceMap: highRefFiles,
    skeleton: skeletonSummary,
  });

  const response = await callLLM(config, prompt, clusterPrompt.system);
  const result = parseJsonResponse(response) as CoreModules;

  logger.info(`  Core modules: ${result.coreModules.length} found`);
  for (const mod of result.coreModules.slice(0, 5)) {
    logger.info(`    - ${mod.name}: ${mod.files.length} files (${mod.reason})`);
  }
  const groups = Object.keys(result.moduleGroups || {});
  logger.info(`  Module groups: ${groups.join(', ')}`);
  appendAgentLog(`[ClusterAgent Result] ${JSON.stringify(result, null, 2)}`);

  logger.success('ClusterAgent: Core modules marked');
  return result;
}
