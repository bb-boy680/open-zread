import type { AppConfig, WikiPage, DehydratedSkeleton, TechStackSummary } from '@open-zread/types';
import { callLLM } from '../agents/llm-client';
import { BASE_SYSTEM_PROMPT, buildUserPrompt } from '../prompts/writer-prompts';
import { buildPageContext } from './context-builder';
import { logger } from '@open-zread/core';

export interface WritePageOptions {
  page: WikiPage;
  config: AppConfig;
  skeleton: DehydratedSkeleton;
  techStackSummary: TechStackSummary;
}

export async function writePage(options: WritePageOptions): Promise<string> {
  const { page, config, skeleton, techStackSummary } = options;

  logger.info(`Writing page: ${page.title}`);

  const context = await buildPageContext(page, { skeleton });

  const systemPrompt = BASE_SYSTEM_PROMPT.replace('{doc_language}', config.doc_language || 'zh');
  const techStackStr = techStackSummary
    ? JSON.stringify(techStackSummary, null, 2)
    : '(未知)';
  const userPrompt = buildUserPrompt(page, context, techStackStr);

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
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to generate page: ${page.title}`);
}
