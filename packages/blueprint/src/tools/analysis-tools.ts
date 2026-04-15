/**
 * Analysis Tools - Tech stack detection and directory tree
 */

import type { ToolDefinition } from '@open-zread/agent'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { getProjectRoot } from '@open-zread/core'
import type { TechStackSummary } from '../types.js'

interface PackageJson {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

/**
 * Detect Tech Stack Tool
 *
 * Detects tech stack from package.json, go.mod, requirements.txt, etc.
 */
export const DetectTechStackTool: ToolDefinition = {
  name: 'detect_tech_stack',
  description: '检测项目技术栈，通过分析 package.json、go.mod、requirements.txt 等配置文件。',
  inputSchema: {
    type: 'object',
    properties: {
      projectRoot: {
        type: 'string',
        description: '项目根目录（可选，默认使用当前目录）'
      }
    },
    required: []
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Detect project tech stack from configuration files.'
  },
  async call(input: { projectRoot?: string }) {
    try {
      const root = input.projectRoot || getProjectRoot()

      const result: TechStackSummary = {
        techStack: {
          languages: [],
          frameworks: [],
          buildTools: []
        },
        projectType: 'unknown',
        entryPoints: []
      }

      // Check package.json
      try {
        const pkgJsonPath = join(root, 'package.json')
        const pkgJsonContent = await readFile(pkgJsonPath, 'utf-8')
        const pkg: PackageJson = JSON.parse(pkgJsonContent)

        result.techStack.languages.push('JavaScript', 'TypeScript')

        // Detect frameworks
        const deps = pkg.dependencies || {}
        const devDeps = pkg.devDependencies || {}

        if (deps.react || devDeps.react) result.techStack.frameworks.push('React')
        if (deps.vue || devDeps.vue) result.techStack.frameworks.push('Vue')
        if (deps.next || devDeps.next) result.techStack.frameworks.push('Next.js')
        if (deps.nuxt || devDeps.nuxt) result.techStack.frameworks.push('Nuxt')
        if (deps.svelte || devDeps.svelte) result.techStack.frameworks.push('Svelte')
        if (deps.express || devDeps.express) result.techStack.frameworks.push('Express')
        if (deps.fastify || devDeps.fastify) result.techStack.frameworks.push('Fastify')
        if (deps.nestjs || deps['@nestjs/core']) result.techStack.frameworks.push('NestJS')

        // Detect build tools
        if (devDeps.vite) result.techStack.buildTools.push('Vite')
        if (devDeps.webpack) result.techStack.buildTools.push('Webpack')
        if (devDeps.rollup) result.techStack.buildTools.push('Rollup')
        if (devDeps.tsup) result.techStack.buildTools.push('tsup')
        if (devDeps.esbuild) result.techStack.buildTools.push('esbuild')
        if (devDeps.turbo) result.techStack.buildTools.push('Turborepo')

        // Detect test frameworks
        if (devDeps.jest || devDeps.vitest) {
          result.techStack.testFrameworks = result.techStack.testFrameworks || []
          if (devDeps.jest) result.techStack.testFrameworks.push('Jest')
          if (devDeps.vitest) result.techStack.testFrameworks.push('Vitest')
        }

        // Determine project type
        if (deps.react || deps.vue || deps.svelte || deps.next || deps.nuxt) {
          result.projectType = 'frontend'
        } else if (deps.express || deps.fastify || deps.nestjs) {
          result.projectType = 'backend'
        } else if (pkg.name?.startsWith('cli-') || devDeps.commander) {
          result.projectType = 'cli'
        } else if (pkg.scripts?.build && !deps.react && !deps.vue) {
          result.projectType = 'library'
        }

        // Find entry points
        if (pkg.scripts?.start) {
          result.entryPoints.push('package.json#scripts.start')
        }
        if (deps.next) {
          result.entryPoints.push('src/app.tsx', 'pages/index.tsx')
        }
        if (!deps.next && !deps.nuxt) {
          result.entryPoints.push('src/index.ts', 'src/main.ts', 'index.ts')
        }
      } catch {
        // package.json not found
      }

      // Check go.mod
      try {
        const goModPath = join(root, 'go.mod')
        const goModContent = await readFile(goModPath, 'utf-8')

        result.techStack.languages.push('Go')
        result.projectType = 'backend'
        result.entryPoints.push('main.go', 'cmd/main.go')

        // Parse go.mod for frameworks
        if (goModContent.includes('gin-gonic')) result.techStack.frameworks.push('Gin')
        if (goModContent.includes('echo')) result.techStack.frameworks.push('Echo')
        if (goModContent.includes('fiber')) result.techStack.frameworks.push('Fiber')
      } catch {
        // go.mod not found
      }

      // Check requirements.txt (Python)
      try {
        const reqPath = join(root, 'requirements.txt')
        const reqContent = await readFile(reqPath, 'utf-8')

        result.techStack.languages.push('Python')

        if (reqContent.includes('django')) result.techStack.frameworks.push('Django')
        if (reqContent.includes('flask')) result.techStack.frameworks.push('Flask')
        if (reqContent.includes('fastapi')) result.techStack.frameworks.push('FastAPI')
      } catch {
        // requirements.txt not found
      }

      // Check Cargo.toml (Rust)
      try {
        const cargoPath = join(root, 'Cargo.toml')
        await readFile(cargoPath, 'utf-8')

        result.techStack.languages.push('Rust')
        result.projectType = 'backend'
        result.entryPoints.push('src/main.rs')
      } catch {
        // Cargo.toml not found
      }

      // Deduplicate languages
      result.techStack.languages = [...new Set(result.techStack.languages)]

      // Update project type for multi-language projects
      if (result.techStack.languages.includes('TypeScript') &&
          result.techStack.languages.includes('Go')) {
        result.projectType = 'fullstack'
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify(result, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `检测失败: ${err.message}`,
        is_error: true
      }
    }
  }
}

/**
 * Get Directory Tree Tool
 *
 * Returns directory tree structure for project analysis.
 */
export const GetDirectoryTreeTool: ToolDefinition = {
  name: 'get_directory_tree',
  description: '获取项目的目录树结构，用于分析项目组织方式。',
  inputSchema: {
    type: 'object',
    properties: {
      maxDepth: {
        type: 'number',
        description: '最大深度（默认 3）'
      },
      excludePatterns: {
        type: 'array',
        items: { type: 'string' },
        description: '排除的模式（如 node_modules, dist）'
      },
      projectRoot: {
        type: 'string',
        description: '项目根目录（可选）'
      }
    },
    required: []
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Get directory tree structure for project.'
  },
  async call(input: { maxDepth?: number; excludePatterns?: string[]; projectRoot?: string }) {
    try {
      const root = input.projectRoot || getProjectRoot()
      const maxDepth = input.maxDepth || 3
      const exclude = input.excludePatterns || ['node_modules', 'dist', '.git', 'build', 'target']

      interface TreeNode {
        name: string
        type: 'file' | 'directory'
        children?: TreeNode[]
      }

      async function buildTree(dir: string, depth: number): Promise<TreeNode[]> {
        if (depth > maxDepth) return []

        const entries = await readdir(dir, { withFileTypes: true })
        const nodes: TreeNode[] = []

        for (const entry of entries) {
          if (exclude.includes(entry.name)) continue

          const node: TreeNode = {
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file'
          }

          if (entry.isDirectory() && depth < maxDepth) {
            const fullPath = join(dir, entry.name)
            node.children = await buildTree(fullPath, depth + 1)
          }

          nodes.push(node)
        }

        // Sort: directories first, then files
        nodes.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name)
          return a.type === 'directory' ? -1 : 1
        })

        return nodes
      }

      const tree = await buildTree(root, 1)

      function formatTree(nodes: TreeNode[], indent: string = ''): string {
        let result = ''
        for (const node of nodes) {
          result += `${indent}${node.name}/\n`
          if (node.children) {
            result += formatTree(node.children, indent + '  ')
          }
        }
        return result
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: formatTree(tree)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `获取目录树失败: ${err.message}`,
        is_error: true
      }
    }
  }
}

/**
 * Analyze References Tool
 *
 * Analyzes reference counts to identify core modules.
 */
export const AnalyzeReferencesTool: ToolDefinition = {
  name: 'analyze_references',
  description: '分析引用计数，识别高频引用的核心模块。',
  inputSchema: {
    type: 'object',
    properties: {
      referenceMap: {
        type: 'object',
        description: '引用计数映射（file -> count）'
      },
      threshold: {
        type: 'number',
        description: '核心模块阈值（引用次数 >= threshold 为核心模块，默认 3）'
      }
    },
    required: ['referenceMap']
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Analyze reference counts to identify core modules.'
  },
  async call(input: { referenceMap: Record<string, number>; threshold?: number }) {
    try {
      const refMap = input.referenceMap as Record<string, number>
      const threshold = input.threshold || 3

      // Sort by reference count
      const sorted = Object.entries(refMap)
        .sort((a, b) => b[1] - a[1])

      // Identify core modules
      const coreFiles = sorted
        .filter(([_, count]) => count >= threshold)
        .map(([file, count]) => ({ file, count }))

      // Group by directory
      const dirGroups: Record<string, string[]> = {}
      for (const [file] of sorted) {
        const dir = file.split('/').slice(0, -1).join('/') || 'root'
        if (!dirGroups[dir]) dirGroups[dir] = []
        dirGroups[dir].push(file)
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          coreModules: coreFiles.slice(0, 20),
          totalCoreFiles: coreFiles.length,
          directoryGroups: Object.entries(dirGroups)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 15)
            .map(([dir, files]) => ({ directory: dir, fileCount: files.length }))
        }, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `分析失败: ${err.message}`,
        is_error: true
      }
    }
  }
}