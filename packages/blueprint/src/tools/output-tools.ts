/**
 * Output Tools - Generate and save wiki.json blueprint
 */

import type { ToolDefinition } from '@open-zread/agent'
import { generateWikiJson } from '@open-zread/core'
import type { WikiPage, AppConfig } from '@open-zread/types'
import type { TechStackSummary, CoreModules } from '../types.js'

interface BlueprintInput {
  pages: WikiPage[]
  techStackSummary?: TechStackSummary
  coreModules?: CoreModules
  language?: 'zh' | 'en'
}

/**
 * Generate Blueprint Tool
 *
 * Generates wiki.json blueprint and saves to drafts directory.
 */
export const GenerateBlueprintTool: ToolDefinition = {
  name: 'generate_blueprint',
  description: '生成 Wiki 蓝图 JSON 文件，保存到 .open-zread/drafts 目录。',
  inputSchema: {
    type: 'object',
    properties: {
      pages: {
        type: 'array',
        description: 'Wiki 页面列表',
        items: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: '页面 slug（如 1-project-overview）' },
            title: { type: 'string', description: '页面标题（如 项目概览）' },
            file: { type: 'string', description: '文件名（如 1-project-overview.md）' },
            section: { type: 'string', description: '所属章节（如 入门指南）' },
            level: { type: 'string', description: '难度等级（Beginner/Intermediate/Advanced）' },
            associatedFiles: {
              type: 'array',
              items: { type: 'string' },
              description: '关联的源文件或目录路径（目录以 / 结尾）'
            }
          },
          required: ['slug', 'title', 'file', 'section']
        }
      },
      techStackSummary: {
        type: 'object',
        description: '技术栈摘要（可选）'
      },
      coreModules: {
        type: 'object',
        description: '核心模块信息（可选）'
      },
      language: {
        type: 'string',
        enum: ['zh', 'en'],
        description: '文档语言（默认 zh）'
      }
    },
    required: ['pages']
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() {
    return 'Generate and save wiki blueprint JSON file.'
  },
  async call(input: BlueprintInput) {
    try {
      const pages = input.pages as WikiPage[]
      const techStackSummary = input.techStackSummary as TechStackSummary | undefined
      const language = input.language || 'zh'

      // Validate pages
      if (!pages || pages.length === 0) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: '错误: pages 数组不能为空',
          is_error: true
        }
      }

      // Build config
      const config: AppConfig = {
        language,
        doc_language: language,
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          api_key: '',
          base_url: ''
        },
        concurrency: {
          max_concurrent: 4,
          max_retries: 3
        }
      }

      // Add tech stack summary to pages if provided
      // (The generateWikiJson function handles this)

      // Generate and save wiki.json
      const outputPath = await generateWikiJson(pages, config, techStackSummary)

      // Build result summary
      const summary = {
        outputPath,
        pagesCount: pages.length,
        sections: [...new Set(pages.map(p => p.section))],
        levels: {
          beginner: pages.filter(p => p.level === 'Beginner').length,
          intermediate: pages.filter(p => p.level === 'Intermediate').length,
          advanced: pages.filter(p => p.level === 'Advanced').length
        },
        hasAssociatedFiles: pages.filter(p => p.associatedFiles && p.associatedFiles.length > 0).length
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Wiki 蓝图已生成: ${outputPath}\n\n详情:\n${JSON.stringify(summary, null, 2)}`
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `生成蓝图失败: ${err.message}`,
        is_error: true
      }
    }
  }
}

/**
 * Validate Blueprint Tool
 *
 * Validates that associatedFiles in pages point to real files or directories.
 */
export const ValidateBlueprintTool: ToolDefinition = {
  name: 'validate_blueprint',
  description: '验证蓝图中的 associatedFiles 字段指向真实存在的文件或目录。',
  inputSchema: {
    type: 'object',
    properties: {
      pages: {
        type: 'array',
        description: 'Wiki 页面列表'
      },
      projectRoot: {
        type: 'string',
        description: '项目根目录（可选）'
      }
    },
    required: ['pages']
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Validate blueprint associated files/directories exist.'
  },
  async call(input: { pages: WikiPage[]; projectRoot?: string }) {
    try {
      const pages = input.pages as WikiPage[]
      const { stat, readdir } = await import('fs/promises')
      const { join } = await import('path')
      const { getProjectRoot } = await import('@open-zread/core')

      const root = input.projectRoot || getProjectRoot()

      interface PathInfo {
        path: string
        type: 'file' | 'directory' | 'missing'
        fileCount?: number  // 目录下的文件数
      }

      const validation: {
        validPages: string[]
        invalidPages: { slug: string; missingPaths: string[] }[]
        warnings: string[]
        pathDetails: { slug: string; paths: PathInfo[] }[]
      } = {
        validPages: [],
        invalidPages: [],
        warnings: [],
        pathDetails: []
      }

      for (const page of pages) {
        if (!page.associatedFiles || page.associatedFiles.length === 0) {
          validation.warnings.push(`${page.slug}: 无关联路径`)
          continue
        }

        const missingPaths: string[] = []
        const pathInfos: PathInfo[] = []

        for (const pathStr of page.associatedFiles) {
          const fullPath = join(root, pathStr)
          try {
            const stats = await stat(fullPath)
            if (stats.isDirectory()) {
              // 目录：统计文件数
              const files = await readdir(fullPath, { recursive: true, withFileTypes: true })
              const tsFiles = files.filter(f => f.isFile() && (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js')))
              pathInfos.push({
                path: pathStr,
                type: 'directory',
                fileCount: tsFiles.length
              })
            } else {
              // 文件
              pathInfos.push({
                path: pathStr,
                type: 'file'
              })
            }
          } catch {
            missingPaths.push(pathStr)
            pathInfos.push({
              path: pathStr,
              type: 'missing'
            })
          }
        }

        validation.pathDetails.push({
          slug: page.slug,
          paths: pathInfos
        })

        if (missingPaths.length > 0) {
          validation.invalidPages.push({
            slug: page.slug,
            missingPaths
          })
        } else {
          validation.validPages.push(page.slug)
        }
      }

      const isValid = validation.invalidPages.length === 0

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          isValid,
          validation,
          summary: {
            totalPages: pages.length,
            validPages: validation.validPages.length,
            invalidPages: validation.invalidPages.length,
            warnings: validation.warnings.length
          }
        }, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `验证失败: ${err.message}`,
        is_error: true
      }
    }
  }
}