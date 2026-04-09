import type { DehydratedSkeleton, TechStackSummary, CoreModules, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse } from './llm-client';
import { logger } from '@open-zread/utils';

const SYSTEM_PROMPT = `You are a code architecture analysis expert. Analyze skeleton code and reference relationships to identify and group core modules.
Output must be JSON format.`;

const USER_PROMPT_TEMPLATE = `Identify core modules based on skeleton code and reference relationships:

Tech Stack: {techStack}
Reference Count Statistics (High-frequency files):
{referenceMap}

Skeleton Code (First 20 files):
{skeleton}

Output JSON format:
{
  "coreModules": [
    { "name": "...", "files": ["..."], "reason": "..." }
  ],
  "moduleGroups": {
    "Getting Started": ["..."],
    "Core Features": ["..."],
    "Advanced Features": ["..."]
  }
}`;

// ClusterAgent
export async function runClusterAgent(
  skeleton: DehydratedSkeleton,
  techStack: TechStackSummary,
  config: AppConfig
): Promise<CoreModules> {
  logger.progress('ClusterAgent: Marking core modules');

  // Extract high-frequency reference files
  const highRefFiles = Object.entries(skeleton.referenceMap)
    .filter(([_, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, count]) => `${path}: ${count} refs`)
    .join('\n');

  // Extract skeleton summary
  const skeletonSummary = skeleton.skeleton
    .slice(0, 20)
    .map(s => `--- ${s.file} ---\n${s.content.slice(0, 200)}...`)
    .join('\n\n');

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{techStack}', JSON.stringify(techStack.techStack))
    .replace('{referenceMap}', highRefFiles)
    .replace('{skeleton}', skeletonSummary);

  const response = await callLLM(config, prompt, SYSTEM_PROMPT);
  const result = parseJsonResponse(response) as CoreModules;

  logger.success('ClusterAgent: Core modules marked');
  return result;
}