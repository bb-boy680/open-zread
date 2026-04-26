/**
 * useArticlesGenerate - Wiki 文章生成 Hook
 *
 * 架构设计：
 * - 状态管理：useImmer
 * - 事件处理：mapper 纯函数
 * - 初始化：由外部显式调用 initialize()
 * - 生成启动：由外部显式调用 start()
 *
 * 流程：外部调用 initialize() → 外部调用 start() → 并行生成各页面
 */

import { useCallback, useRef } from "react";
import { useImmer } from "use-immer";
import { loadConfig, getWikiDir, joinPath } from "@open-zread/utils";
import { generateWikiContent, type ArticleEventPayload } from "@open-zread/orchestrator";
import { articleEventToState } from "../mapper";
import { createInitialArticlesState } from "../state";
import type { ArticlesState, WikiPage } from "../types";

// ==================== 接口定义 ====================

interface UseArticlesGenerateOptions {
  /** 文章列表（来自 wiki.json） */
  pages: WikiPage[];
  /** 完成回调（只通知完成，不触发 reload） */
  onComplete?: () => void;
}

interface UseArticlesGenerateReturn {
  /** 文章生成状态 */
  state: ArticlesState;
  /** 操作方法 */
  actions: {
    /** 初始化：检测已存在文档并设置状态，返回 pendingPages 列表（由组合层显式调用） */
    initialize: () => Promise<WikiPage[]>;
    /** 开始生成，接收待生成页面列表（由组合层显式调用） */
    start: (pendingPages: WikiPage[]) => Promise<void>;
    /** 重试所有失败文章 */
    retryFailed: () => void;
    /** 重试单篇文章 */
    retryPage: (slug: string) => void;
  };
}

// ==================== Hook 实现 ====================

export function useArticlesGenerate({
  pages,
  onComplete,
}: UseArticlesGenerateOptions): UseArticlesGenerateReturn {
  // 初始化状态（空状态，等待 initialize() 调用）
  const [state, updateState] = useImmer<ArticlesState>(() =>
    createInitialArticlesState([])
  );
  const isGenerating = useRef(false);
  const isInitialized = useRef(false);

  /**
   * 初始化：检测已存在文档并设置状态
   *
   * 由组合层在 pages 确定后显式调用，不使用 useEffect 自动触发。
   * 返回待生成的 pages 列表，避免调用方闭包陷阱。
   */
  const initialize = useCallback(async (): Promise<WikiPage[]> => {
    if (pages.length === 0 || isInitialized.current) return [];
    isInitialized.current = true;

    const wikiDir = getWikiDir();
    const existingSlugs: string[] = [];

    for (const page of pages) {
      const filePath = joinPath(wikiDir, page.section, page.file);
      try {
        const file = Bun.file(filePath);
        const exists = await file.exists();
        if (exists) {
          existingSlugs.push(page.slug);
        }
      } catch {
        // 文件检查失败，视为不存在
      }
    }

    const pendingCount = pages.length - existingSlugs.length;

    // 一次性更新状态
    updateState((draft) => {
      const newState = createInitialArticlesState(pages);
      Object.assign(draft, newState);

      for (const slug of existingSlugs) {
        draft.pages[slug] = { status: "completed" };
      }
      draft.completedCount = existingSlugs.length;
      draft.pendingCount = pendingCount;
    });

    // 返回待生成的 pages 列表（避免闭包陷阱）
    return pages.filter((page) => !existingSlugs.includes(page.slug));
  }, [pages, updateState]);

  /**
   * 事件回调
   */
  const handleEvent = useCallback(
    (event: ArticleEventPayload) => {
      updateState((draft) => {
        const newState = articleEventToState(
          { ...draft } as ArticlesState,
          event
        );
        Object.assign(draft, newState);
      });
    },
    [updateState]
  );

  /**
   * 开始生成
   *
   * 由组合层在 initialize() 完成后显式调用。
   * 接收 initialize() 返回的 pendingPages 列表，避免闭包陷阱。
   */
  const start = useCallback(async (pendingPages: WikiPage[]) => {
    if (isGenerating.current || pendingPages.length === 0) return;

    // 直接加载配置，避免闭包陷阱（不依赖 configLoaded state）
    let concurrent = 1;
    try {
      const config = await loadConfig();
      concurrent = config.concurrency.max_concurrent;
    } catch {
      // 配置加载失败，使用默认值
    }

    isGenerating.current = true;


    try {
      await generateWikiContent({
        pages: pendingPages,
        maxConcurrent: concurrent,
        onEvent: handleEvent,
      });
      onComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      handleEvent({
        type: "page_error",
        slug: pendingPages[0]?.slug ?? "unknown",
        error: message,
      });
    } finally {
      isGenerating.current = false;
    }
  }, [handleEvent, onComplete]);

  /**
   * 重试所有失败文章
   */
  const retryFailed = useCallback(() => {
    updateState((draft) => {
      for (const [slug, status] of Object.entries(draft.pages)) {
        if (status.status === "failed") {
          draft.pages[slug] = { status: "waiting" };
          draft.failedCount--;
          draft.pendingCount++;
        }
      }
    });
  }, [updateState]);

  /**
   * 重试单篇文章
   */
  const retryPage = useCallback(
    (slug: string) => {
      updateState((draft) => {
        if (draft.pages[slug]?.status === "failed") {
          draft.pages[slug] = { status: "waiting" };
          draft.failedCount--;
          draft.pendingCount++;
        }
      });
    },
    [updateState]
  );

  return {
    state,
    actions: { initialize, start, retryFailed, retryPage },
  };
}