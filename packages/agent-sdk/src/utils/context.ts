/**
 * System & User Context
 *
 * Builds context for the system prompt:
 * - Git status injection (branch, commits, status)
 * - AGENT.md / project context discovery and injection
 * - Working directory info
 * - Date injection
 */

import { execSync } from 'child_process'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

// Memoization cache
let cachedGitStatus: string | null = null
let cachedGitStatusCwd: string | null = null

/**
 * Get git status info for system prompt.
 * Memoized per cwd (cleared on new session).
 */
export async function getGitStatus(cwd: string): Promise<string> {
  if (cachedGitStatus && cachedGitStatusCwd === cwd) {
    return cachedGitStatus
  }

  try {
    const parts: string[] = []

    const gitExec = (cmd: string, timeoutMs = 5000): string | null => {
      try {
        return execSync(cmd, {
          cwd, timeout: timeoutMs, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
        }).trim()
      } catch {
        return null
      }
    }

    // Check if this is a git repo at all
    if (!gitExec('git rev-parse --git-dir')) return ''

    // Current branch
    const branch = gitExec('git rev-parse --abbrev-ref HEAD')
    if (branch) parts.push(`Current branch: ${branch}`)

    // Main branch detection
    const mainBranch = detectMainBranch(cwd)
    if (mainBranch) parts.push(`Main branch: ${mainBranch}`)

    // Git user
    const user = gitExec('git config user.name', 3000)
    if (user) parts.push(`Git user: ${user}`)

    // Status (staged + unstaged)
    const status = gitExec('git status --short')
    if (status) {
      const truncated = status.length > 2000
        ? status.slice(0, 2000) + '\n...(truncated)'
        : status
      parts.push(`Status:\n${truncated}`)
    }

    // Recent commits (only if HEAD exists)
    const hasHead = gitExec('git rev-parse HEAD')
    if (hasHead) {
      const log = gitExec('git log --oneline -5 --no-decorate')
      if (log) parts.push(`Recent commits:\n${log}`)
    }

    cachedGitStatus = parts.join('\n\n')
    cachedGitStatusCwd = cwd

    return cachedGitStatus
  } catch {
    return ''
  }
}

/**
 * Detect the main branch name (main or master).
 */
function detectMainBranch(cwd: string): string | null {
  try {
    const branches = execSync('git branch -l main master', {
      cwd, timeout: 3000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    if (branches.includes('main')) return 'main'
    if (branches.includes('master')) return 'master'
    return null
  } catch {
    return null
  }
}

/**
 * Discover project context files (AGENT.md, CLAUDE.md) in the project.
 */
export async function discoverProjectContextFiles(cwd: string): Promise<string[]> {
  const candidates = [
    join(cwd, 'AGENT.md'),
    join(cwd, 'CLAUDE.md'),
    join(cwd, '.claude', 'CLAUDE.md'),
    join(cwd, 'claude.md'),
  ]

  // Also check home directory
  const home = process.env.HOME || process.env.USERPROFILE || ''
  if (home) {
    candidates.push(
      join(home, '.claude', 'CLAUDE.md'),
    )
  }

  const found: string[] = []
  for (const path of candidates) {
    try {
      const s = await stat(path)
      if (s.isFile()) {
        found.push(path)
      }
    } catch {
      // File doesn't exist
    }
  }

  return found
}

/**
 * Read project context file content from discovered files.
 */
export async function readProjectContextContent(cwd: string): Promise<string> {
  const files = await discoverProjectContextFiles(cwd)
  if (files.length === 0) return ''

  const parts: string[] = []
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8')
      if (content.trim()) {
        parts.push(`# From ${file}:\n${content.trim()}`)
      }
    } catch {
      // Skip unreadable files
    }
  }

  return parts.join('\n\n')
}

/**
 * Get system context for the system prompt.
 */
export async function getSystemContext(cwd: string): Promise<string> {
  const parts: string[] = []

  const gitStatus = await getGitStatus(cwd)
  if (gitStatus) {
    parts.push(`gitStatus: ${gitStatus}`)
  }

  return parts.join('\n\n')
}

/**
 * Get user context (AGENT.md, date, etc).
 */
export async function getUserContext(cwd: string): Promise<string> {
  const parts: string[] = []

  // Current date
  parts.push(`# currentDate\nToday's date is ${new Date().toISOString().split('T')[0]}.`)

  // Project context files
  const projectCtx = await readProjectContextContent(cwd)
  if (projectCtx) {
    parts.push(projectCtx)
  }

  return parts.join('\n\n')
}

/**
 * Clear memoized context (call between sessions).
 */
export function clearContextCache(): void {
  cachedGitStatus = null
  cachedGitStatusCwd = null
}
