import type { AppConfig, WikiPage, DehydratedSkeleton, TechStackSummary, CacheManifest } from '@open-zread/types';
import { writePage } from './writer-agent';
import { WikiStore } from '@open-zread/storage';
import { logger, getProjectRoot } from '@open-zread/utils';
import { join } from 'path';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { BASE_SYSTEM_PROMPT, TYPE_PROMPTS } from './prompts';

export interface WriterManagerOptions {
  pages: WikiPage[];
  config: AppConfig;
  skeleton: DehydratedSkeleton;
  techStackSummary: TechStackSummary;
  lastManifest: CacheManifest | null;
  force: boolean;
}

export interface PageResult {
  page: WikiPage;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  outputPath?: string;
}

// 计算骨架 Hash
function computeSkeletonHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

// 判断页面是否需要重写（增量更新逻辑）
function shouldRewritePage(
  page: WikiPage,
  lastManifest: CacheManifest | null,
  currentSkeleton: DehydratedSkeleton
): boolean {
  if (!lastManifest) return true;
  if (!page.associatedFiles || page.associatedFiles.length === 0) return true;

  const skeletonMap = new Map(currentSkeleton.skeleton.map(s => [s.file, s.content]));

  return page.associatedFiles.some(filePath => {
    const lastFile = lastManifest.files.find(f => f.path === filePath);
    if (!lastFile) return true; // 新文件

    // 有 skeletonHash 则比对骨架
    if (lastFile.skeletonHash) {
      const currentContent = skeletonMap.get(filePath);
      if (!currentContent) return true;
      const currentSkeletonHash = computeSkeletonHash(currentContent);
      return currentSkeletonHash !== lastFile.skeletonHash;
    }

    // 回退到文件 Hash 比对
    return true;
  });
}

// 计算 Prompt 模板的 Hash（用于检测 Prompt 变更）
function computePromptHash(): string {
  const allPrompts = BASE_SYSTEM_PROMPT + JSON.stringify(TYPE_PROMPTS);
  return createHash('md5').update(allPrompts).digest('hex');
}

export async function runWriterManager(
  options: WriterManagerOptions
): Promise<PageResult[]> {
  const { pages, config, skeleton, techStackSummary, lastManifest, force } = options;
  const store = new WikiStore();
  const results: PageResult[] = [];
  const maxConcurrent = config.concurrency?.max_concurrent || 4;

  // 判断 Prompt 是否变更
  const currentPromptHash = computePromptHash();
  const promptChanged = lastManifest?.promptHash !== currentPromptHash;

  // 分类页面
  const pagesToWrite: WikiPage[] = [];
  const pagesToSkip: WikiPage[] = [];

  for (const page of pages) {
    if (force || promptChanged) {
      pagesToWrite.push(page);
    } else if (shouldRewritePage(page, lastManifest, skeleton)) {
      pagesToWrite.push(page);
    } else {
      pagesToSkip.push(page);
      results.push({ page, status: 'skipped', reason: '骨架未变更' });
    }
  }

  // 并发写入 (使用 p-limit)
  const limit = pLimit(maxConcurrent);

  const writeTasks = pagesToWrite.map((page, index) =>
    limit(async () => {
      logger.info(`[${index + 1}/${pages.length}] 正在生成: ${page.title}...`);
      try {
        const content = await writePage({ page, config, skeleton, techStackSummary });
        const outputPath = await store.writePage(page, content);
        results.push({ page, status: 'success', outputPath });
        logger.success(`[✓] ${page.file}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push({ page, status: 'failed', reason: errMsg });
        logger.error(`[✗] ${page.file} - ${errMsg}`);
      }
    })
  );

  await Promise.all(writeTasks);

  // 输出跳过信息
  for (const page of pagesToSkip) {
    logger.info(`[⊘] ${page.file} (跳过，骨架未变)`);
  }

  // 版本快照
  await store.createSnapshot();

  // 摘要
  const successCount = results.filter(r => r.status === 'success').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  logger.info(`\n生成完成: ${successCount} 成功, ${skippedCount} 跳过, ${failedCount} 失败`);

  return results;
}
