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

import { useCallback, useRef, useState, useEffect } from "react";
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
    /** 初始化：检测已存在文档并设置状态（由组合层显式调用） */
    initialize: () => Promise<void>;
    /** 开始生成（由组合层显式调用） */
    start: () => Promise<void>;
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

  // 从配置获取并发数
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [configLoaded, setConfigLoaded] = useState(false);
  useEffect(() => {
    loadConfig().then((config) => {
      setMaxConcurrent(config.concurrency.max_concurrent);
      setConfigLoaded(true);
    }).catch(() => {
      setMaxConcurrent(1);
      setConfigLoaded(true);
    });
  }, []);

  /**
   * 初始化：检测已存在文档并设置状态
   *
   * 由组合层在 pages 确定后显式调用，不使用 useEffect 自动触发。
   */
  const initialize = useCallback(async () => {
    if (pages.length === 0 || isInitialized.current) return;
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

    // 一次性更新状态
    updateState((draft) => {
      const newState = createInitialArticlesState(pages);
      Object.assign(draft, newState);

      for (const slug of existingSlugs) {
        draft.pages[slug] = { status: "completed" };
      }
      draft.completedCount = existingSlugs.length;
      draft.pendingCount = pages.length - existingSlugs.length;
    });
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
   * 开始生成（只生成 waiting 状态的文章）
   *
   * 由组合层在 initialize() 完成后显式调用。
   */
  const start = useCallback(async () => {
    if (isGenerating.current || pages.length === 0) return;

    // 等待 config 加载完成
    if (!configLoaded) {
      // 配置未加载，稍等一下
      await new Promise((resolve) => {
        const check = () => {
          if (configLoaded) resolve(undefined);
          else setTimeout(check, 50);
        };
        check();
      });
    }

    isGenerating.current = true;

    // 计算待生成的页面列表
    const pendingPages = pages.filter(
      (page) => state.pages[page.slug]?.status === "waiting"
    );

    if (pendingPages.length === 0) {
      isGenerating.current = false;
      return;
    }

    try {
      await generateWikiContent({
        pages: pendingPages,
        maxConcurrent,
        onEvent: handleEvent,
      });
      onComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (state.currentPageSlug) {
        handleEvent({
          type: "page_error",
          slug: state.currentPageSlug,
          error: message,
        });
      }
    } finally {
      isGenerating.current = false;
    }
  }, [pages, state.pages, state.currentPageSlug, maxConcurrent, configLoaded, handleEvent, onComplete]);

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