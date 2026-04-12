import type { WikiPage, DehydratedSkeleton } from '@open-zread/types';
import { getProjectRoot } from '@open-zread/utils';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface BuildContextOptions {
  skeleton: DehydratedSkeleton;
  maxContextLength?: number;
}

export async function buildPageContext(
  page: WikiPage,
  options: BuildContextOptions
): Promise<string> {
  const { skeleton, maxContextLength = 80000 } = options;
  const parts: string[] = [];
  const skeletonMap = new Map(skeleton.skeleton.map(s => [s.file, s.content]));

  if (page.associatedFiles && page.associatedFiles.length > 0) {
    parts.push(`## 关联文件骨架\n`);

    for (const filePath of page.associatedFiles) {
      const skeletonContent = skeletonMap.get(filePath);
      if (skeletonContent) {
        parts.push(`### 文件: ${filePath}\n`);
        parts.push(`\`\`\`\n${skeletonContent}\n\`\`\`\n`);
      } else {
        const projectRoot = getProjectRoot();
        const fullPath = join(projectRoot, filePath);
        parts.push(`### 文件: ${filePath} (直接读取)\n`);
        try {
          const source = readFileSync(fullPath, 'utf-8');
          parts.push(`\`\`\`\n${source.slice(0, 5000)}\n\`\`\`\n`);
        } catch {
          parts.push(`\n(文件读取失败: ${filePath})\n`);
        }
      }
    }
  }

  let context = parts.join('\n');
  if (context.length > maxContextLength) {
    context = context.slice(0, maxContextLength) + '\n\n...(上下文已截断)';
  }

  return context;
}
