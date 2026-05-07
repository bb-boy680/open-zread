import { useMemo } from 'react';
import GithubSlugger from 'github-slugger';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function useTableOfContents(content: string): TocItem[] {
  return useMemo(() => {
    const headings: TocItem[] = [];
    const slugger = new GithubSlugger();

    // 简单正则提取 h2-h4 headings
    const regex = /^(#{2,4})\s+(.+)$/gm;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugger.slug(text);

      headings.push({ id, text, level });
    }

    return headings;
  }, [content]);
}
