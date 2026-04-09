import type { FileManifest, DehydratedSkeleton, WikiPage, AppConfig, TechStackSummary, CoreModules } from '@open-zread/types';
import { runScanAgent } from './scan-agent';
import { runClusterAgent } from './cluster-agent';
import { runOutlineAgent } from './outline-agent';
import { logger } from '@open-zread/utils';

// Orchestrate Agent execution
export async function runAgents(
  manifest: FileManifest,
  skeleton: DehydratedSkeleton,
  config: AppConfig
): Promise<WikiPage[]> {
  logger.progress('Running agents');

  // Step 1: ScanAgent
  const techStack = await runScanAgent(manifest, config);

  // Step 2: ClusterAgent
  const coreModules = await runClusterAgent(skeleton, techStack, config);

  // Step 3: OutlineAgent
  const pages = await runOutlineAgent(techStack, coreModules, manifest, config);

  return pages;
}