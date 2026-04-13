import type { FileManifest, DehydratedSkeleton, WikiPage, AppConfig } from '@open-zread/types';
import { runScanAgent } from './scan-agent';
import { runClusterAgent } from './cluster-agent';
import { runOutlineAgent } from './outline-agent';
import { logger } from '@open-zread/core';

export async function runAgents(
  manifest: FileManifest,
  skeleton: DehydratedSkeleton,
  config: AppConfig
): Promise<WikiPage[]> {
  logger.progress('Running agents');

  const techStack = await runScanAgent(manifest, config);

  const coreModules = await runClusterAgent(skeleton, techStack, config);

  const pages = await runOutlineAgent(techStack, coreModules, manifest, config);

  return pages;
}
