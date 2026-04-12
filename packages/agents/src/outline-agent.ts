import type { TechStackSummary, CoreModules, FileManifest, WikiPage, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse, appendAgentLog } from './llm-client';
import { validateOutput } from './path-resolver';
import { outlinePrompt, fillPrompt } from './prompts';
import { logger } from '@open-zread/utils';

// Generate slug
function generateSlug(title: string): string {
  const keywordMap: Record<string, string> = {
    'Project': 'project',
    'Overview': 'overview',
    'Quick': 'quick',
    'Start': 'start',
    'Environment': 'environment',
    'Config': 'config',
    'Setup': 'setup',
    'Core': 'core',
    'Features': 'features',
    'Advanced': 'advanced',
    'Guide': 'guide',
    'Install': 'install',
    'Usage': 'usage',
    'Tutorial': 'tutorial',
  };

  const parts = title.split(' ').filter(Boolean);
  const slugParts = parts.map(p => keywordMap[p] || p.toLowerCase());
  return slugParts.join('-');
}

// OutlineAgent
export async function runOutlineAgent(
  techStack: TechStackSummary,
  coreModules: CoreModules,
  manifest: FileManifest,
  config: AppConfig
): Promise<WikiPage[]> {
  logger.progress('OutlineAgent: Generating wiki outline');

  // Provide broader path coverage for validation
  const validPaths = manifest.files.slice(0, 200).map(f => f.path).join('\n');

  const prompt = fillPrompt(outlinePrompt.user, {
    techStack: JSON.stringify(techStack),
    coreModules: JSON.stringify(coreModules),
    language: config.language,
    validPaths: validPaths,
  });

  const response = await callLLM(config, prompt, outlinePrompt.system);
  const result = parseJsonResponse(response) as { pages: WikiPage[] };

  // Path validation
  const validatedPages = validateOutput(result.pages, manifest);

  // Fill in slug (if missing)
  const finalPages = validatedPages.map((page, index) => ({
    ...page,
    slug: page.slug || `${index + 1}-${generateSlug(page.title)}`,
  }));

  // Log what the AI generated
  logger.info(`  Pages generated: ${finalPages.length}`);
  for (const page of finalPages) {
    logger.info(`    - [${page.section}] ${page.title} (${page.slug})`);
  }
  appendAgentLog(`[OutlineAgent Result] ${JSON.stringify({ pages: finalPages }, null, 2)}`);

  logger.success('OutlineAgent: Wiki outline generated');
  return finalPages;
}