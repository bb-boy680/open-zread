import { useEffect } from 'react';
import { useWikiStore } from '../store/useWikiStore';

/**
 * 草稿检测 hook
 * 检测是否存在未完成的 wiki 草稿
 */
export function useDraftCheck(): void {
  const setDraft = useWikiStore((s) => s.setDraft);

  useEffect(() => {
    (async () => {
      const { loadWikiBlueprint, getProjectRoot } = await import('@open-zread/utils');
      const { existsSync } = await import('fs');
      const { join } = await import('path');

      const root = getProjectRoot();
      const blueprintPath = join(root, '.open-zread', 'drafts', 'wiki.json');

      if (!existsSync(blueprintPath)) {
        setDraft({ exists: false, completed: 0, total: 0 });
        return;
      }

      const blueprint = await loadWikiBlueprint();
      const total = blueprint.pages.length;
      let completed = 0;

      for (const p of blueprint.pages) {
        const outputPath = join(root, '.open-zread', 'wiki', 'current', p.file);
        if (existsSync(outputPath)) {
          completed++;
        }
      }

      setDraft({ exists: true, completed, total });
    })();
  }, [setDraft]);
}