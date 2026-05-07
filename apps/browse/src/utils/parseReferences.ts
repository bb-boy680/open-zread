// apps/browse/src/utils/parseReferences.ts
import type { CodeReference } from '@/types/wiki';

export function parseReferences(content: string): CodeReference[] {
  const references: CodeReference[] = [];

  // Match Sources: line with markdown links
  const sourcesMatch = content.match(/Sources:\s*([\s\S]*?)(?:\n\n|\n#{1,6}\s|$)/);
  if (!sourcesMatch) return references;

  const sourcesLine = sourcesMatch[1];

  // Match [filename](filepath#Lstart-Lend) pattern
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(sourcesLine)) !== null) {
    const fileName = match[1];
    const fullPath = match[2];

    // Parse line numbers
    const lineMatch = fullPath.match(/#L(\d+)(?:-L(\d+))?$/);
    const filePath = lineMatch ? fullPath.replace(/#L\d+(?:-L\d+)?$/, '') : fullPath;

    references.push({
      fileName,
      filePath,
      lineStart: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      lineEnd: lineMatch?.[2] ? parseInt(lineMatch[2], 10) : undefined
    });
  }

  return references;
}
