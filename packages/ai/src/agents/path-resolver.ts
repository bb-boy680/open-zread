import type { FileManifest, WikiPage } from '@open-zread/types';
import { logger } from '@open-zread/core';

export function validateOutput(
  pages: WikiPage[],
  manifest: FileManifest
): WikiPage[] {
  const validPaths = new Set(manifest.files.map(f => f.path));

  return pages.map(page => {
    if (!page.associatedFiles) {
      return page;
    }

    const validatedFiles: string[] = [];

    for (const filePath of page.associatedFiles) {
      if (validPaths.has(filePath)) {
        validatedFiles.push(filePath);
        continue;
      }

      const normalizedPath = filePath.replace(/[/\\]/g, '/');
      const match = manifest.files.find(
        f => f.path.replace(/[/\\]/g, '/') === normalizedPath
      );

      if (match) {
        validatedFiles.push(match.path);
        logger.info(`Path corrected: ${filePath} -> ${match.path}`);
      } else {
        logger.warn(`Path not found, removed: ${filePath}`);
      }
    }

    return { ...page, associatedFiles: validatedFiles };
  });
}
