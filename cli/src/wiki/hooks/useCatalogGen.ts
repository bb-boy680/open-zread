import { useEffect } from 'react';
import { useWikiStore } from '../store/useWikiStore';

/**
 * 目录生成 hook
 * 执行文件扫描、解析、Blueprint Agent 生成
 */
export function useCatalogGen(): void {
  const page = useWikiStore((s) => s.page);
  const catalogStatus = useWikiStore((s) => s.catalogStatus);
  const setCatalogStatus = useWikiStore((s) => s.setCatalogStatus);
  const setCatalogTokens = useWikiStore((s) => s.setCatalogTokens);
  const initTasks = useWikiStore((s) => s.initTasks);
  const setError = useWikiStore((s) => s.setError);

  useEffect(() => {
    if (page !== 'catalog' || catalogStatus !== 'running') return;

    (async () => {
      try {
        const {
          getProjectRoot,
          loadCachedManifest,
          saveCachedManifest,
          loadCachedSymbols,
          saveCachedSymbols,
          needsReprocess,
          loadWikiBlueprint,
        } = await import('@open-zread/utils');
        const { scanFiles, parseFiles } = await import('@open-zread/repo-analyzer');
        const { generateWikiCatalog } = await import('@open-zread/orchestrator');

        const root = getProjectRoot();

        // 1. 扫描文件
        const manifest = await scanFiles(root);
        if (manifest.totalFiles === 0) {
          setError('No parseable source files found');
          return;
        }

        // 2. 检查缓存
        const cachedManifest = await loadCachedManifest();
        const cachedSymbols = await loadCachedSymbols();

        let symbols;
        if (!needsReprocess(cachedManifest, manifest) && cachedSymbols) {
          symbols = cachedSymbols;
        } else {
          // 3. 解析文件
          symbols = await parseFiles(manifest);
          // 4. 保存缓存
          await saveCachedManifest(manifest);
          await saveCachedSymbols(symbols);
        }

        // 5. Blueprint Agent
        const res = await generateWikiCatalog();
        setCatalogStatus('done');
        setCatalogTokens({
          in: res.tokenUsage?.input_tokens ?? 0,
          out: res.tokenUsage?.output_tokens ?? 0,
        });

        // 6. 加载蓝图并初始化任务
        const blueprint = await loadWikiBlueprint();
        initTasks(blueprint.pages.map((p) => ({ id: p.slug, title: p.title })));

      } catch (e) {
        setCatalogStatus('failed');
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [page, catalogStatus, setCatalogStatus, setCatalogTokens, initTasks, setError]);
}