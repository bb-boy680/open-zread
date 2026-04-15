/**
 * Hook System
 *
 * Lifecycle hooks for intercepting agent behavior.
 * Supports pre/post tool use, session lifecycle, and custom events.
 *
 * Hook events:
 * - PreToolUse: before tool execution
 * - PostToolUse: after tool execution
 * - PostToolUseFailure: after tool failure
 * - SessionStart: session initialization
 * - SessionEnd: session cleanup
 * - Stop: when turn completes
 * - SubagentStart: subagent spawned
 * - SubagentStop: subagent completed
 * - UserPromptSubmit: user sends message
 * - PermissionRequest: permission check triggered
 * - TaskCreated: task created
 * - TaskCompleted: task finished
 * - ConfigChange: settings changed
 * - CwdChanged: working directory changed
 * - FileChanged: file modified
 * - Notification: system notification
 */

import { spawn } from 'child_process'

/**
 * All supported hook events.
 */
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'UserPromptSubmit',
  'PermissionRequest',
  'PermissionDenied',
  'TaskCreated',
  'TaskCompleted',
  'ConfigChange',
  'CwdChanged',
  'FileChanged',
  'Notification',
  'PreCompact',
  'PostCompact',
  'TeammateIdle',
] as const

export type HookEvent = typeof HOOK_EVENTS[number]

/**
 * Hook definition.
 */
export interface HookDefinition {
  /** Shell command or function to execute */
  command?: string
  /** Function handler */
  handler?: (input: HookInput) => Promise<HookOutput | undefined>
  /** Tool name matcher (regex pattern) */
  matcher?: string
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Hook input passed to handlers.
 */
export interface HookInput {
  event: HookEvent
  toolName?: string
  toolInput?: unknown
  toolOutput?: unknown
  toolUseId?: string
  sessionId?: string
  cwd?: string
  error?: string
  [key: string]: unknown
}

/**
 * Hook output returned by handlers.
 */
export interface HookOutput {
  /** Message to append to conversation */
  message?: string
  /** Permission update */
  permissionUpdate?: {
    tool: string
    behavior: 'allow' | 'deny'
  }
  /** Whether to block the action */
  block?: boolean
  /** Notification */
  notification?: {
    title: string
    body: string
    level?: 'info' | 'warning' | 'error'
  }
}

/**
 * Hook configuration (from settings).
 */
export type HookConfig = Record<string, HookDefinition[]>

/**
 * Hook registry for managing and executing hooks.
 */
export class HookRegistry {
  private hooks: Map<HookEvent, HookDefinition[]> = new Map()

  /**
   * Register hooks from configuration.
   */
  registerFromConfig(config: HookConfig): void {
    for (const [event, definitions] of Object.entries(config)) {
      const hookEvent = event as HookEvent
      if (!HOOK_EVENTS.includes(hookEvent)) continue

      const existing = this.hooks.get(hookEvent) || []
      this.hooks.set(hookEvent, [...existing, ...definitions])
    }
  }

  /**
   * Register a single hook.
   */
  register(event: HookEvent, definition: HookDefinition): void {
    const existing = this.hooks.get(event) || []
    existing.push(definition)
    this.hooks.set(event, existing)
  }

  /**
   * Execute hooks for an event.
   */
  async execute(
    event: HookEvent,
    input: HookInput,
  ): Promise<HookOutput[]> {
    const definitions = this.hooks.get(event) || []
    const results: HookOutput[] = []

    for (const def of definitions) {
      // Check matcher for tool-specific hooks
      if (def.matcher && input.toolName) {
        const regex = new RegExp(def.matcher)
        if (!regex.test(input.toolName)) continue
      }

      try {
        let output: HookOutput | undefined = undefined

        if (def.handler) {
          // Function handler
          output = await Promise.race([
            def.handler(input),
            new Promise<undefined>((_, reject) =>
              setTimeout(() => reject(new Error('Hook timeout')), def.timeout || 30000),
            ),
          ])
        } else if (def.command) {
          // Shell command handler
          output = await executeShellHook(def.command, input, def.timeout || 30000)
        }

        if (output) {
          results.push(output)
        }
      } catch (err: any) {
        // Log but don't fail on hook errors
        console.error(`[Hook] ${event} hook failed: ${err.message}`)
      }
    }

    return results
  }

  /**
   * Check if any hooks are registered for an event.
   */
  hasHooks(event: HookEvent): boolean {
    return (this.hooks.get(event)?.length || 0) > 0
  }

  /**
   * Clear all hooks.
   */
  clear(): void {
    this.hooks.clear()
  }
}

/**
 * Execute a shell command as a hook.
 */
async function executeShellHook(
  command: string,
  input: HookInput,
  timeout: number,
): Promise<HookOutput | undefined> {
  return new Promise((resolve) => {
    const proc = spawn('bash', ['-c', command], {
      timeout,
      env: {
        ...process.env,
        HOOK_EVENT: input.event,
        HOOK_TOOL_NAME: input.toolName || '',
        HOOK_SESSION_ID: input.sessionId || '',
        HOOK_CWD: input.cwd || '',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Send input as JSON on stdin
    proc.stdin?.write(JSON.stringify(input))
    proc.stdin?.end()

    const chunks: Buffer[] = []
    proc.stdout?.on('data', (d: Buffer) => chunks.push(d))

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(undefined)
        return
      }

      const stdout = Buffer.concat(chunks).toString('utf-8').trim()
      if (!stdout) {
        resolve(undefined)
        return
      }

      try {
        const output = JSON.parse(stdout) as HookOutput
        resolve(output)
      } catch {
        // Non-JSON output treated as message
        resolve({ message: stdout })
      }
    })

    proc.on('error', () => resolve(undefined))
  })
}

/**
 * Create a default hook registry.
 */
export function createHookRegistry(config?: HookConfig): HookRegistry {
  const registry = new HookRegistry()
  if (config) {
    registry.registerFromConfig(config)
  }
  return registry
}
