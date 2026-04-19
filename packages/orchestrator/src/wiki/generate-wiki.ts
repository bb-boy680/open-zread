/**
 * Wiki Content Generation Engine
 *
 * TypeScript control flow for parallel Wiki page generation.
 *
 * Architecture: "Code for control flow, LLM for content"
 * - TypeScript uses p-limit for concurrency control
 * - Each Wiki page gets an independent Agent via createAgent
 * - Error isolation: single page failure doesn't affect others
 */

import pLimit from 'p-limit';
import { loadConfig, loadWikiBlueprint, logger } from '@open-zread/utils';
import { createAgent } from '../agents/create-agent.js';
import { FileEditTool, FileReadTool, FileWriteTool, GlobTool, GrepTool } from '@open-zread/agent-sdk';
import { SearchCodeTool, WritePageTool } from '../tools/page-tools.js';
import PageAgentPrompt from '../prompts/page-agent.mdx';
import type { WikiPage } from '@open-zread/types';
import type { WikiResult, ProgressState, PageResult } from './types.js';

/**
 * Generate Wiki Content Options
 */
export interface GenerateWikiOptions {
  /** Blueprint file path (default: .open-zread/drafts/wiki.json) */
  blueprintPath?: string;
  /** Custom concurrency limit (overrides config) */
  maxConcurrent?: number;
  /** Progress callback for CLI display */
  onProgress?: (state: ProgressState) => void;
}

/**
 * Build page-specific prompt
 */
function buildPagePrompt(page: WikiPage): string {
  const associatedFilesList = page.associatedFiles?.map(f => `- ${f}`).join('\n') || '（无关联路径）';

  return `${PageAgentPrompt}

---

## 当前页面任务

**标题**: ${page.title}
**Slug**: ${page.slug}
**文件**: ${page.file}
**章节**: ${page.section}
**难度**: ${page.level}

**关联路径**:
${associatedFilesList}

请按照三步工作流执行，最后使用 write_page 输出文档。`;
}

/**
 * Generate Wiki Content
 *
 * Parallel Wiki page generation with p-limit concurrency control.
 */
export async function generateWikiContent(options?: GenerateWikiOptions): Promise<WikiResult> {
  const startTime = performance.now();

  // 1. Load config
  const config = await loadConfig();
  const maxConcurrent = 1;

  // 2. Load blueprint
  const blueprint = await loadWikiBlueprint(options?.blueprintPath);
  const pages = blueprint.pages;

  logger.info(`开始生成 Wiki 内容：${pages.length} 个页面，并发数 ${maxConcurrent}`);

  // 3. Create concurrency limiter
  const limit = pLimit(maxConcurrent);

  // 4. Initialize progress tracking
  const progress: ProgressState = {
    total: pages.length,
    completed: 0,
    failed: 0,
    pending: pages.length,
    currentPage: null,
    results: [],
  };

  // 5. Parallel page generation using existing createAgent
  const tasks = pages.map((page) =>
    limit(async () => {
      const pageStartTime = performance.now();

      // Update progress
      progress.currentPage = page;
      progress.pending--;
      options?.onProgress?.(progress);

      try {
        // Use existing createAgent pattern: tools + prompts
        const result = await createAgent({
          tools: [
            FileReadTool,
            FileWriteTool,
            FileEditTool,
            GlobTool,
            GrepTool
          ],
          prompts: buildPagePrompt(page),
          maxTurns: 15,
        });

        // Success
        progress.completed++;
        const pageResult: PageResult = {
          slug: page.slug,
          success: true,
          outputPath: result.outputPath,
          durationMs: Math.round(performance.now() - pageStartTime),
        };
        progress.results.push(pageResult);

        logger.success(`[${page.slug}] 完成 (${pageResult.durationMs}ms)`);

        return pageResult;

      } catch (err: unknown) {
        // Error isolation: single page failure doesn't stop others
        const message = err instanceof Error ? err.message : String(err);

        progress.failed++;
        const pageResult: PageResult = {
          slug: page.slug,
          success: false,
          error: message,
          durationMs: Math.round(performance.now() - pageStartTime),
        };
        progress.results.push(pageResult);

        logger.error(`[${page.slug}] 失败: ${message}`);

        return pageResult;
      }
    })
  );

  // 6. Wait for all tasks
  await Promise.all(tasks);

  const durationMs = Math.round(performance.now() - startTime);

  logger.info(
    `Wiki 内容生成完成：${progress.completed}/${progress.total} 成功，${progress.failed} 失败 (${durationMs}ms)`
  );

  return {
    total: pages.length,
    completed: progress.completed,
    failed: progress.failed,
    durationMs,
    results: progress.results,
  };
}