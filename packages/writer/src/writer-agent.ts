import type { AppConfig, WikiPage, DehydratedSkeleton, TechStackSummary } from '@open-zread/types';
import { callLLM } from '@open-zread/agents';
import { BASE_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import { buildPageContext } from './context-builder';
import { logger } from '@open-zread/utils';

export interface WritePageOptions {
  page: WikiPage;
  config: AppConfig;
  skeleton: DehydratedSkeleton;
  techStackSummary: TechStackSummary;
}

export async function writePage(options: WritePageOptions): Promise<string> {
  const { page, config, skeleton, techStackSummary } = options;

  logger.info(`Writing page: ${page.title}`);

  // Build context
  const context = await buildPageContext(page, { skeleton });

  // Build prompts
  const systemPrompt = BASE_SYSTEM_PROMPT.replace('{doc_language}', config.doc_language || 'zh');
  const techStackStr = techStackSummary
    ? JSON.stringify(techStackSummary, null, 2)
    : '(未知)';
  const userPrompt = buildUserPrompt(page, context, techStackStr);

  // Call LLM with retry
  const maxRetries = config.concurrency?.max_retries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(config, userPrompt, systemPrompt);
      logger.success(`Page "${page.title}" generated (${response.length} chars)`);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Page "${page.title}" attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to generate page: ${page.title}`);
}
