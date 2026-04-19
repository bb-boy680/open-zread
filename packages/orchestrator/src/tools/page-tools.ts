/**
 * Page Agent Tools
 *
 * Tools for Wiki page content generation.
 *
 * - search_code: Search code snippets using ripgrep
 * - write_page: Write Wiki page content to file
 *
 * Note: agent-sdk already has built-in Read tool, so we don't need get_module_context.
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { defineTool, getRequiredString, getString, getNumber } from '@open-zread/agent-sdk';
import type { ToolInputParams, ToolContext } from '@open-zread/agent-sdk';
import { ensureDir, writeTextFile } from '@open-zread/utils';

/**
 * Search Code Tool
 *
 * Search code snippets in the project using ripgrep.
 * Supports pattern matching, file type filtering, and context lines.
 */
export const SearchCodeTool = defineTool({
  name: 'search_code',
  description: `在项目中搜索代码片段。支持正则表达式、文件类型过滤和上下文行。
返回匹配的代码行和文件路径。用于寻找代码的真实调用用例。`,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '搜索模式（正则表达式或字符串）',
      },
      path: {
        type: 'string',
        description: '搜索路径（可选，默认为项目根目录）',
      },
      glob: {
        type: 'string',
        description: '文件类型过滤（如 "*.ts", "*.{ts,tsx}"）',
      },
      context: {
        type: 'number',
        description: '上下文行数（默认 3）',
      },
      head_limit: {
        type: 'number',
        description: '结果数量限制（默认 50）',
      },
    },
    required: ['pattern'],
  },
  isReadOnly: true,
  isConcurrencySafe: true,
  async call(input: ToolInputParams, context: ToolContext): Promise<string> {
    const pattern = getRequiredString(input, 'pattern');
    const customPath = getString(input, 'path');
    const searchPath = customPath ? resolve(context.cwd, customPath) : context.cwd;
    const glob = getString(input, 'glob');
    const contextLines = getNumber(input, 'context') ?? 3;
    const headLimit = getNumber(input, 'head_limit') ?? 50;

    // Build ripgrep command
    const args: string[] = [
      '--line-number',
      '-C', String(contextLines),
      '--head-limit', String(headLimit),
    ];

    if (glob) {
      args.push('--glob', glob);
    }

    args.push('--', pattern, searchPath);

    // Execute ripgrep
    return new Promise((resolvePromise) => {
      const proc = spawn('rg', args, {
        cwd: context.cwd,
        timeout: 15000,
      });

      const chunks: Buffer[] = [];
      proc.stdout?.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr?.on('data', (d: Buffer) => chunks.push(d));

      proc.on('close', (code) => {
        const result = Buffer.concat(chunks).toString('utf-8').trim();

        if (!result || code !== 0) {
          resolvePromise(`未找到匹配: "${pattern}"`);
        } else {
          // Format result
          const lines = result.split('\n');
          if (lines.length > headLimit) {
            resolvePromise(
              lines.slice(0, headLimit).join('\n') +
              `\n... (${lines.length - headLimit} more matches)`
            );
          } else {
            resolvePromise(result);
          }
        }
      });

      proc.on('error', () => {
        resolvePromise(`搜索失败: ripgrep (rg) 命令不可用。请确保系统已安装 ripgrep。`);
      });
    });
  },
});

/**
 * Write Page Tool
 *
 * Write Wiki page content to .open-zread/wiki/current/{slug}.md
 * Automatically handles directory creation and YAML frontmatter.
 */
export const WritePageTool = defineTool({
  name: 'write_page',
  description: `将 Wiki 页面内容写入文件。自动处理目录结构和 YAML frontmatter。
输出路径: .open-zread/wiki/current/{slug}.md`,
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: '页面 slug（如 "4-types"）',
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

    // Build output path
    const wikiDir = resolve(context.cwd, '.open-zread/wiki/current');
    const filePath = resolve(wikiDir, `${slug}.md`);

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