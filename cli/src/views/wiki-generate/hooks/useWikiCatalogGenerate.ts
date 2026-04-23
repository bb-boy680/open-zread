/**
 * useWikiCatalogGenerate - Wiki 目录生成 Hook
 *
 * 处理目录生成的完整业务逻辑：
 * - 扫描文件 → 解析文件 → 保存缓存（统一显示 [请求中])
 * - 调用 generateWikiCatalog（显示工具调用、Token）
 * - 错误处理和重试
 */

import { useCallback, useRef, useEffect } from "react";
import { useImmer } from "use-immer";
import { scanFiles, parseFiles } from "@open-zread/repo-analyzer";
import { saveCachedSymbols } from "@open-zread/utils";
import { generateWikiCatalog, type CatalogEvent } from "@open-zread/orchestrator";
import type { CatalogProgress } from "../types";

interface UseWikiCatalogGenerateOptions {
  hasWikiCatalog: boolean;
  onComplete?: () => void;
}

interface UseWikiCatalogGenerateReturn {
  catalogProgress: CatalogProgress;
  startGenerate: () => Promise<void>;
  retryGenerate: () => void;
}

export function useWikiCatalogGenerate({
  hasWikiCatalog,
  onComplete,
}: UseWikiCatalogGenerateOptions): UseWikiCatalogGenerateReturn {
  const [catalogProgress, updateProgress] = useImmer<CatalogProgress>({
    status: "waiting",
  });

  const isGenerating = useRef(false);

  // Agent 进度回调
  const onAgentEvent = useCallback((event: CatalogEvent) => {
    updateProgress((draft) => {
      switch (event.type) {
        case "requesting":
          draft.phase = "requesting";
          break;

        case "responding":
          draft.phase = "responding";
          if (event.usage) {
            draft.upBytes = event.usage.input_tokens;
            draft.downBytes = event.usage.output_tokens;
          }
          break;

        case "tool_start":
          draft.phase = "tool";
          draft.currentTool = event.toolName;
          if (event.usage) {
            draft.upBytes = event.usage.input_tokens;
            draft.downBytes = event.usage.output_tokens;
          }
          break;

        case "tool_result":
          draft.phase = "responding";
          if (event.usage) {
            draft.upBytes = event.usage.input_tokens;
            draft.downBytes = event.usage.output_tokens;
          }
          break;

        case "complete":
          draft.status = "completed";
          draft.durationMs = event.durationMs;
          if (event.usage) {
            draft.upBytes = event.usage.input_tokens;
            draft.downBytes = event.usage.output_tokens;
          }
          break;

        case "error":
          draft.status = "failed";
          draft.error = event.error;
          draft.durationMs = event.durationMs;
          break;
      }
    });

    if (event.type === "complete") {
      onComplete?.();
    }
  }, [updateProgress, onComplete]);

  const startGenerate = useCallback(async () => {
    if (isGenerating.current) return;
    isGenerating.current = true;

    updateProgress((draft) => {
      draft.status = "loading";
      draft.phase = "requesting";  // 扫描/解析统一显示请求中
    });

    try {
      // Phase 1-2: 扫描 + 解析（UI 显示 [请求中])
      const manifest = await scanFiles();
      if (manifest.files.length === 0) {
        updateProgress((draft) => {
          draft.status = "failed";
          draft.error = "No files found";
        });
        return;
      }

      const symbols = await parseFiles(manifest);
      await saveCachedSymbols(symbols);

      // Phase 3: 调用 Agent
      await generateWikiCatalog(onAgentEvent);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      updateProgress((draft) => {
        draft.status = "failed";
        draft.error = message;
      });
    } finally {
      isGenerating.current = false;
    }
  }, [updateProgress, onAgentEvent]);

  const retryGenerate = useCallback(() => {
    updateProgress((draft) => {
      draft.status = "waiting";
      draft.phase = undefined;
      draft.currentTool = undefined;
      draft.error = undefined;
      draft.upBytes = undefined;
      draft.downBytes = undefined;
      draft.durationMs = undefined;
    });
  }, [updateProgress]);

  useEffect(() => {
    if (!hasWikiCatalog && catalogProgress.status === "waiting" && !isGenerating.current) {
      startGenerate();
    }
  }, [hasWikiCatalog, catalogProgress.status, startGenerate]);

  return { catalogProgress, startGenerate, retryGenerate };
}