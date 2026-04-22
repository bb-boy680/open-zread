/**
 * WikiProvider - Wiki 数据加载 Provider
 *
 * 仅负责加载 wiki.json，不包含业务逻辑
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import type { WikiOutput } from '@open-zread/types';
import { getDraftsDir, joinPath } from '@open-zread/utils';

export interface WikiContextValue {
  wikiCatalog: WikiOutput | null;  // wiki.json 数据（不存在则为 null）
  reload: () => Promise<void>;     // 重新加载 wiki.json
}

export const WikiContext = createContext<WikiContextValue | null>(null);

interface WikiProviderProps {
  children?: ReactNode;
}

export function WikiProvider({ children }: WikiProviderProps) {
  const [wikiCatalog, setWikiCatalog] = useState<WikiOutput | null>(null);

  // 加载 wiki.json
  const loadCatalog = useCallback(async () => {
    const draftsDir = getDraftsDir();
    const wikiPath = joinPath(draftsDir, 'wiki.json');

    try {
      const file = Bun.file(wikiPath);
      const exists = await file.exists();
      if (exists) {
        const content = await file.json();
        setWikiCatalog(content as WikiOutput);
      } else {
        setWikiCatalog(null);
      }
    } catch {
      setWikiCatalog(null);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // reload 方法
  const reload = useCallback(async () => {
    await loadCatalog();
  }, [loadCatalog]);

  return (
    <WikiContext.Provider value={{ wikiCatalog, reload }}>
      {children ?? <Outlet />}
    </WikiContext.Provider>
  );
}

// Hook
export function useWiki(): WikiContextValue {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWiki must be used within WikiProvider');
  }
  return context;
}