import type { TechStackSummary, CoreModules, FileManifest, WikiPage, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse } from './llm-client';
import { validateOutput } from './path-resolver';
import { logger } from '@open-zread/utils';

const SYSTEM_PROMPT = `You are a documentation planning expert. Design Wiki directory structure based on project tech stack and core modules.
Output must be JSON format.
Note: Do not generate non-existent file paths.`;

const USER_PROMPT_TEMPLATE = `Design Wiki directory structure based on tech stack and core modules:

Tech Stack: {techStack}
Core Modules: {coreModules}
Language Preference: {language}

Existing file paths (for reference only, do not create new paths):
{validPaths}

Output JSON format:
{
  "pages": [
    {
      "slug": "1-project-overview",
      "title": "Project Overview",
      "file": "1-project-overview.md",
      "section": "Getting Started",
      "level": "Beginner",
      "associatedFiles": ["src/index.ts"]
    }
  ]
}`;

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

  const validPaths = manifest.files.slice(0, 100).map(f => f.path).join('\n');

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{techStack}', JSON.stringify(techStack))
    .replace('{coreModules}', JSON.stringify(coreModules))
    .replace('{language}', config.language)
    .replace('{validPaths}', validPaths);

  const response = await callLLM(config, prompt, SYSTEM_PROMPT);
  const result = parseJsonResponse(response) as { pages: WikiPage[] };

  // Path validation
  const validatedPages = validateOutput(result.pages, manifest);

  // Fill in slug (if missing)
  const finalPages = validatedPages.map((page, index) => ({
    ...page,
    slug: page.slug || `${index + 1}-${generateSlug(page.title)}`,
  }));

  logger.success('OutlineAgent: Wiki outline generated');
  return finalPages;
}