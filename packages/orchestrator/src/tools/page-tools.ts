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

interface MermaidValidationIssue {
  block: number;
  line: number;
  nodeId: string;
  label: string;
}

interface MermaidBlock {
  code: string;
  startLine: number;
}

type PageToolResult = string | { data: string; is_error?: boolean };

const MERMAID_FENCE_RE = /^```[ \t]*mermaid[^\n]*\n([\s\S]*?)^```[ \t]*$/gim;
const FLOWCHART_HEADER_RE = /^(graph|flowchart)\b/i;
const FLOWCHART_NODE_LABEL_RE = /\b([A-Za-z_][\w-]*)\[([^\]\n]+)\]/g;
const LABEL_REQUIRES_QUOTES_RE = /[(){}|<>]/;

function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  let match: RegExpExecArray | null;

  MERMAID_FENCE_RE.lastIndex = 0;
  while ((match = MERMAID_FENCE_RE.exec(markdown)) !== null) {
    const beforeBlock = markdown.slice(0, match.index);
    blocks.push({
      code: match[1],
      startLine: beforeBlock.split('\n').length,
    });
  }

  return blocks;
}

function isFlowchart(code: string): boolean {
  const firstMeaningfulLine = code
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0 && !line.startsWith('%%'));

  return firstMeaningfulLine ? FLOWCHART_HEADER_RE.test(firstMeaningfulLine) : false;
}

function isQuotedLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  );
}

function validateMermaidContent(content: string): MermaidValidationIssue[] {
  const issues: MermaidValidationIssue[] = [];

  for (const [blockIndex, block] of extractMermaidBlocks(content).entries()) {
    if (!isFlowchart(block.code)) continue;

    for (const [lineIndex, line] of block.code.split('\n').entries()) {
      let match: RegExpExecArray | null;

      FLOWCHART_NODE_LABEL_RE.lastIndex = 0;
      while ((match = FLOWCHART_NODE_LABEL_RE.exec(line)) !== null) {
        const [, nodeId, label] = match;

        if (!isQuotedLabel(label) && LABEL_REQUIRES_QUOTES_RE.test(label)) {
          issues.push({
            block: blockIndex + 1,
            line: block.startLine + lineIndex,
            nodeId,
            label,
          });
        }
      }
    }
  }

  return issues;
}

function formatMermaidValidationError(issues: MermaidValidationIssue[]): string {
  const details = issues
    .map(issue =>
      `- Mermaid block ${issue.block}, line ${issue.line}: node "${issue.nodeId}" label contains Mermaid structural characters and must be quoted: ${issue.nodeId}["${issue.label}"]`,
    )
    .join('\n');

  return [
    'Mermaid validation failed.',
    'Flowchart node labels containing characters such as (), {}, |, or HTML tags must use quoted labels.',
    'Example: RC["reference-counter.ts<br/>引用计数器<br/>O(n) 文件索引"]',
    '',
    details,
  ].join('\n');
}

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
  async call(input: ToolInputParams, context: ToolContext): Promise<PageToolResult> {
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
    const mermaidIssues = validateMermaidContent(fullContent);
    if (mermaidIssues.length > 0) {
      return {
        data: JSON.stringify({
          success: false,
          error: formatMermaidValidationError(mermaidIssues),
        }),
        is_error: true,
      };
    }

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
      return {
        data: JSON.stringify({
          success: false,
          error: message,
        }),
        is_error: true,
      };
    }
  },
});
