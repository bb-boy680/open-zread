/**
 * GrepTool - Search file contents using regex
 */

import { spawn } from 'child_process'
import { resolve } from 'path'
import { defineTool, getRequiredString, getString, getNumber, getBoolean } from './types.js'

export const GrepTool = defineTool({
  name: 'Grep',
  description: 'Search file contents using regex patterns. Uses ripgrep (rg) if available, falls back to grep. Supports file type filtering and context lines.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'File or directory to search in (defaults to cwd)',
      },
      glob: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.ts", "*.{js,jsx}")',
      },
      type: {
        type: 'string',
        description: 'File type filter (e.g., "ts", "py", "js")',
      },
      output_mode: {
        type: 'string',
        enum: ['content', 'files_with_matches', 'count'],
        description: 'Output mode (default: files_with_matches)',
      },
      '-i': {
        type: 'boolean',
        description: 'Case insensitive search',
      },
      '-n': {
        type: 'boolean',
        description: 'Show line numbers (default: true)',
      },
      '-A': { type: 'number', description: 'Lines after match' },
      '-B': { type: 'number', description: 'Lines before match' },
      '-C': { type: 'number', description: 'Context lines' },
      context: { type: 'number', description: 'Context lines (alias for -C)' },
      head_limit: { type: 'number', description: 'Limit output entries (default: 250)' },
    },
    required: ['pattern'],
  },
  isReadOnly: true,
  isConcurrencySafe: true,
  async call(input, context) {
    const pattern = getRequiredString(input, 'pattern')
    const pathValue = getString(input, 'path')
    const searchPath = pathValue ? resolve(context.cwd, pathValue) : context.cwd
    const outputMode = getString(input, 'output_mode') || 'files_with_matches'
    const headLimit = getNumber(input, 'head_limit') ?? 250

    // Build rg command (fall back to grep if rg unavailable)
    const args: string[] = []

    // Try ripgrep first
    const cmd = 'rg'

    if (outputMode === 'files_with_matches') {
      args.push('--files-with-matches')
    } else if (outputMode === 'count') {
      args.push('--count')
    } else {
      // content mode
      if (getBoolean(input, '-n') !== false) args.push('--line-number')
    }

    if (getBoolean(input, '-i')) args.push('--ignore-case')
    const aVal = getNumber(input, '-A')
    if (aVal !== undefined) args.push('-A', String(aVal))
    const bVal = getNumber(input, '-B')
    if (bVal !== undefined) args.push('-B', String(bVal))
    const ctx = getNumber(input, '-C') ?? getNumber(input, 'context')
    if (ctx !== undefined) args.push('-C', String(ctx))
    const glob = getString(input, 'glob')
    if (glob) args.push('--glob', glob)
    const typeVal = getString(input, 'type')
    if (typeVal) args.push('--type', typeVal)

    args.push('--', pattern, searchPath)

    return new Promise<string>((resolvePromise) => {
      const proc = spawn(cmd, args, {
        cwd: context.cwd,
        timeout: 30000,
      })

      const chunks: Buffer[] = []
      const errChunks: Buffer[] = []
      proc.stdout?.on('data', (d: Buffer) => chunks.push(d))
      proc.stderr?.on('data', (d: Buffer) => errChunks.push(d))

      proc.on('close', (code) => {
        let result = Buffer.concat(chunks).toString('utf-8').trim()

        if (!result && code !== 0) {
          // Try fallback to grep
          const grepArgs = ['-r']
          if (getBoolean(input, '-i')) grepArgs.push('-i')
          if (outputMode === 'files_with_matches') grepArgs.push('-l')
          if (outputMode === 'count') grepArgs.push('-c')
          if (outputMode === 'content' && getBoolean(input, '-n') !== false) grepArgs.push('-n')
          if (glob) grepArgs.push('--include', glob)
          grepArgs.push('--', pattern, searchPath)

          const grepProc = spawn('grep', grepArgs, {
            cwd: context.cwd,
            timeout: 30000,
          })

          const grepChunks: Buffer[] = []
          grepProc.stdout?.on('data', (d: Buffer) => grepChunks.push(d))
          grepProc.on('close', () => {
            const grepResult = Buffer.concat(grepChunks).toString('utf-8').trim()
            if (!grepResult) {
              resolvePromise(`No matches found for pattern "${pattern}"`)
            } else {
              // Apply head limit
              const lines = grepResult.split('\n')
              if (headLimit > 0 && lines.length > headLimit) {
                resolvePromise(lines.slice(0, headLimit).join('\n') + `\n... (${lines.length - headLimit} more)`)
              } else {
                resolvePromise(grepResult)
              }
            }
          })
          grepProc.on('error', () => {
            resolvePromise(`No matches found for pattern "${pattern}"`)
          })
          return
        }

        if (!result) {
          resolvePromise(`No matches found for pattern "${pattern}"`)
          return
        }

        // Apply head limit
        const lines = result.split('\n')
        if (headLimit > 0 && lines.length > headLimit) {
          result = lines.slice(0, headLimit).join('\n') + `\n... (${lines.length - headLimit} more)`
        }

        resolvePromise(result)
      })

      proc.on('error', () => {
        // rg not found, try grep directly
        const grepArgs = ['-r', '-n', '--', pattern, searchPath]
        const grepProc = spawn('grep', grepArgs, {
          cwd: context.cwd,
          timeout: 30000,
        })
        const grepChunks: Buffer[] = []
        grepProc.stdout?.on('data', (d: Buffer) => grepChunks.push(d))
        grepProc.on('close', () => {
          const grepResult = Buffer.concat(grepChunks).toString('utf-8').trim()
          resolvePromise(grepResult || `No matches found for pattern "${pattern}"`)
        })
        grepProc.on('error', () => {
          resolvePromise(`Error: neither rg nor grep available`)
        })
      })
    })
  },
})
