import { useEffect } from 'react';
import { useWikiStore } from '../store/useWikiStore';

/**
 * Wiki 内容生成 hook
 * 执行 Wiki 内容生成并更新任务状态
 */
export function useWikiGen(): void {
  const page = useWikiStore((s) => s.page);
  const tasks = useWikiStore((s) => s.tasks);
  const setTaskStatus = useWikiStore((s) => s.setTaskStatus);
  const setTaskTokens = useWikiStore((s) => s.setTaskTokens);
  const complete = useWikiStore((s) => s.complete);
  const setError = useWikiStore((s) => s.setError);

  useEffect(() => {
    if (page !== 'wiki' || tasks.length === 0 || tasks.every((t) => t.status !== 'pending')) {
      return;
    }

    (async () => {
      try {
        const { generateWikiContent } = await import('@open-zread/orchestrator');

        await generateWikiContent({
          onProgress: (progress) => {
            for (const r of progress.results) {
              if (r.success) {
                setTaskStatus(r.slug, 'done');
                if (r.tokenUsage) {
                  setTaskTokens(r.slug, {
                    in: r.tokenUsage.input_tokens,
                    out: r.tokenUsage.output_tokens,
                  });
                }
              } else {
                setTaskStatus(r.slug, 'failed');
              }
            }
          },
        });

        // 检查是否全部完成
        const currentTasks = useWikiStore.getState().tasks;
        if (currentTasks.every((t) => t.status === 'done')) {
          complete();
        }

      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [page, tasks.length, setTaskStatus, setTaskTokens, complete, setError]);
}