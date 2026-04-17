/**
 * Git Worktree Tools
 *
 * EnterWorktree / ExitWorktree - Isolated git worktree environments
 * for parallel work without affecting the main working tree.
 */

import { execSync } from 'child_process'
import { join } from 'path'
import type { ToolDefinition, ToolInputParams, ToolResult } from '../types.js'
import { getString, getRequiredString } from './types.js'

// Track active worktrees
const activeWorktrees = new Map<string, { path: string; branch: string; originalCwd: string }>()

export const EnterWorktreeTool: ToolDefinition = {
  name: 'EnterWorktree',
  description: 'Create an isolated git worktree for parallel work. The agent will work in the worktree without affecting the main working tree.',
  inputSchema: {
    type: 'object',
    properties: {
      branch: { type: 'string', description: 'Branch name for the worktree (auto-generated if not provided)' },
      path: { type: 'string', description: 'Path for the worktree (auto-generated if not provided)' },
    },
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Create an isolated git worktree for parallel work.' },
  async call(input: ToolInputParams, context: { cwd: string }): Promise<ToolResult> {
    try {
      // Check if we're in a git repo
      execSync('git rev-parse --git-dir', { cwd: context.cwd, encoding: 'utf-8' })

      const branch = getString(input, 'branch') || `worktree-${Date.now()}`
      const worktreePath = getString(input, 'path') || join(context.cwd, '..', `.worktree-${branch}`)

      // Create the branch if it doesn't exist
      try {
        execSync(`git branch ${branch}`, { cwd: context.cwd, encoding: 'utf-8', stdio: 'pipe' })
      } catch {
        // Branch might already exist
      }

      // Create worktree
      execSync(`git worktree add ${JSON.stringify(worktreePath)} ${branch}`, {
        cwd: context.cwd,
        encoding: 'utf-8',
      })

      const id = crypto.randomUUID()
      activeWorktrees.set(id, {
        path: worktreePath,
        branch,
        originalCwd: context.cwd,
      })

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Worktree created:\n  ID: ${id}\n  Path: ${worktreePath}\n  Branch: ${branch}\n\nYou are now working in the isolated worktree.`,
      }
    } catch (err: unknown) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Error creating worktree: ${err instanceof Error ? err.message : String(err)}`,
        is_error: true,
      }
    }
  },
}

export const ExitWorktreeTool: ToolDefinition = {
  name: 'ExitWorktree',
  description: 'Exit and optionally remove a git worktree. Use "keep" to preserve changes or "remove" to clean up.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Worktree ID' },
      action: {
        type: 'string',
        enum: ['keep', 'remove'],
        description: 'Whether to keep or remove the worktree (default: remove)',
      },
    },
    required: ['id'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Exit a git worktree.' },
  async call(input: ToolInputParams): Promise<ToolResult> {
    const id = getRequiredString(input, 'id')
    const worktree = activeWorktrees.get(id)
    if (!worktree) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Worktree not found: ${id}`,
        is_error: true,
      }
    }

    const action = getString(input, 'action') || 'remove'

    try {
      if (action === 'remove') {
        execSync(`git worktree remove ${JSON.stringify(worktree.path)} --force`, {
          cwd: worktree.originalCwd,
          encoding: 'utf-8',
        })
        // Clean up branch
        try {
          execSync(`git branch -D ${worktree.branch}`, {
            cwd: worktree.originalCwd,
            encoding: 'utf-8',
            stdio: 'pipe',
          })
        } catch {
          // Branch might have commits
        }
      }

      activeWorktrees.delete(id)

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Worktree ${action === 'remove' ? 'removed' : 'kept'}: ${worktree.path}`,
      }
    } catch (err: unknown) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        is_error: true,
      }
    }
  },
}
