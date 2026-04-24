/**
 * Page Agent Tools
 *
 * Tools for Wiki page content generation.
 *
 * - write_page: Write Wiki page content to file with organized path structure
 *
 * Note: agent-sdk provides GrepTool and GlobTool for code search, no need to duplicate.
 */

import { resolve, dirname } from 'path';
import { defineTool, getRequiredString, getString } from '@open-zread/agent-sdk';
import type { ToolInputParams, ToolContext } from '@open-zread/agent-sdk';
import { ensureDir, writeTextFile } from '@open-zread/utils';

/**
 * Write Page Tool
 *
 * Write Wiki page content to the specified file path.
 * Uses WikiPage.file field for path, organized by section.
 *
 * Path structure: .open-zread/wiki/{section}/{file}
 * Example: .open-zread/wiki/入门指南/1-project-overview.md
 */
export const WritePageTool = defineTool({
  name: 'write_page',
  description: `将 Wiki 页面内容写入指定文件路径。按照章节组织目录结构。
输出路径: .open-zread/wiki/{file}`,
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: '页面 slug（如 "1-project-overview"）',
      },
      file: {
        type: 'string',
        description: '文件名或相对路径，如 "1-project-overview.md"',
      },
      section: {
        type: 'string',
        description: '所属章节（如 "入门指南"），用于组织目录结构',
      },
      content: {
        type: 'string',
        description: 'Markdown 格式的页面内容',
      },
      title: {
        type: 'string',
        description: '页面标题（可选，用于 YAML frontmatter）',
      },
    },
    required: ['slug', 'content'],
  },
  isReadOnly: false,
  isConcurrencySafe: false, // Write operation needs exclusive access
  async call(input: ToolInputParams, context: ToolContext): Promise<string> {
    const slug = getRequiredString(input, 'slug');
    const content = getRequiredString(input, 'content');
    const title = getString(input, 'title');
    const file = getString(input, 'file');
    const section = getString(input, 'section');

    // Build output path based on file and section
    // Priority: file parameter (with section if needed) > slug fallback
    let filePath: string;
    if (file) {
      // If file contains path separator, use it directly
      // Otherwise, organize by section
      if (file.includes('/') || file.includes('\\')) {
        filePath = resolve(context.cwd, '.open-zread/wiki', file);
      } else if (section) {
        filePath = resolve(context.cwd, '.open-zread/wiki', section, file);
      } else {
        filePath = resolve(context.cwd, '.open-zread/wiki', file);
      }
    } else {
      // Fallback: use slug if file is not provided
      const wikiDir = resolve(context.cwd, '.open-zread/wiki');
      filePath = resolve(wikiDir, `${slug}.md`);
    }

    // Build YAML frontmatter
    const frontmatter = title
      ? `---\ntitle: "${title}"\nslug: "${slug}"\n---\n\n`
      : '';

    const fullContent = frontmatter + content;

    // Write file
    try {
      await ensureDir(dirname(filePath));
      await writeTextFile(filePath, fullContent);

      return JSON.stringify({
        success: true,
        path: filePath,
        slug,
        section: section || '未分类',
        size: fullContent.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({
        success: false,
        error: message,
      });
    }
  },
});