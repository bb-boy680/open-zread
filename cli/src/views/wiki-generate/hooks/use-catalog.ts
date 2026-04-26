/**
 * useCatalogGenerate - Wiki 目录生成 Hook
 *
 * 架构设计：
 * - 状态管理：useImmer
 * - 事件处理：mapper 纯函数
 * - 副作用控制：useRef 防止并发
 *
 * 流程：扫描文件 → 解析文件 → 保存缓存 → Agent 生成
 */

import { useCallback, useRef, useEffect } from "react";
import { useImmer } from "use-immer";
import { scanFiles, parseFiles } from "@open-zread/repo-analyzer";
import { saveCachedSymbols } from "@open-zread/utils";
import { generateWikiCatalog, type CatalogEvent } from "@open-zread/orchestrator";
import { catalogEventToState } from "../mapper";
import { initialCatalogState } from "../state";
import type { CatalogState, CatalogEventPayload } from "../types";

// ==================== 接口定义 ====================

interface UseCatalogGenerateOptions {
  /** 是否已有 wiki.json */
  hasWikiCatalog: boolean;
  /** 强制重新生成（忽略现有 wiki.json） */
  forceRegenerate?: boolean;
  /** 完成回调 */
  onComplete?: () => void;
}

interface UseCatalogGenerateReturn {
  /** 目录生成状态 */
  state: CatalogState;
  /** 操作方法 */
  actions: {
    /** 开始生成 */
    start: () => Promise<void>;
    /** 重试 */
    retry: () => void;
  };
}

// ==================== Hook 实现 ====================

export function useCatalogGenerate({
  hasWikiCatalog,
  forceRegenerate,
  onComplete,
}: UseCatalogGenerateOptions): UseCatalogGenerateReturn {
  const [state, updateState] = useImmer<CatalogState>(initialCatalogState);
  const isGenerating = useRef(false);

  /**
   * 已有目录时直接标记完成
   *
   * 当 wiki.json 已存在且不强制重新生成时，目录状态直接设为 completed。
   */
  useEffect(() => {
    if (hasWikiCatalog && !forceRegenerate && state.status === "waiting") {
      updateState((draft) => {
        draft.status = "completed";
      });
    }
  }, [hasWikiCatalog, forceRegenerate, state.status, updateState]);

  /**
   * Agent 事件回调
   *
   * 将原始 CatalogEvent 转换为标准 CatalogEventPayload，
   * 然后调用 mapper 纯函数更新状态。
   */
  const handleAgentEvent = useCallback(
    (rawEvent: CatalogEvent) => {
      // 转换为标准 payload（usage 直接使用 SDK TokenUsage）
      const event: CatalogEventPayload = {
        type: rawEvent.type,
        toolName: rawEvent.toolName,
        usage: rawEvent.usage,
        error: rawEvent.error,
        durationMs: rawEvent.durationMs,
      };

      // 使用 mapper 纯函数更新状态
      updateState((draft) => {
        const newState = catalogEventToState(
          { ...draft } as CatalogState,
          event
        );
        // 将纯函数结果合并回 draft
        Object.assign(draft, newState);
      });

      // 完成时触发回调
      if (rawEvent.type === "complete") {
        onComplete?.();
      }
    },
    [updateState, onComplete]
  );

  /**
   * 开始生成
   */
  const start = useCallback(async () => {
    if (isGenerating.current) return;
    isGenerating.current = true;

    // 扫描阶段
    updateState((draft) => {
      Object.assign(draft, catalogEventToState(initialCatalogState, { type: "scanning" }));
    });

    try {
      // Phase 1-2: 扫描 + 解析
      const manifest = await scanFiles();
      if (manifest.files.length === 0) {
        updateState((draft) => {
          draft.status = "failed";
          draft.error = "No files found";
        });
        return;
      }

      const symbols = await parseFiles(manifest);
      await saveCachedSymbols(symbols);

      // Phase 3: 调用 Agent
      await generateWikiCatalog(handleAgentEvent);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      updateState((draft) => {
        draft.status = "failed";
        draft.error = message;
      });
    } finally {
      isGenerating.current = false;
    }
  }, [updateState, handleAgentEvent]);

  /**
   * 重试
   */
  const retry = useCallback(() => {
    updateState((draft) => {
      Object.assign(draft, initialCatalogState);
    });
  }, [updateState]);

  /**
   * 自动触发
   *
   * 当 wiki.json 不存在，或强制重新生成时，自动开始生成。
   */
  useEffect(() => {
    // 触发条件：
    // 1. 没有 wiki.json（hasWikiCatalog=false）
    // 2. 或强制重新生成（forceRegenerate=true）
    // 3. 状态为 waiting
    // 4. 未正在生成
    const shouldStart = (!hasWikiCatalog || forceRegenerate) &&
                        state.status === "waiting" &&
                        !isGenerating.current;

    if (shouldStart) {
      start();
    }
  }, [hasWikiCatalog, forceRegenerate, state.status, start]);

  return {
    state,
    actions: { start, retry },
  };
}