/**
 * Skill System Types
 *
 * Skills are reusable prompt templates that extend agent capabilities.
 * They can be invoked by the model via the Skill tool or by users via /skillname.
 */

import type { ToolContext } from '../types.js'
import type { HookConfig } from '../hooks.js'

/**
 * Content block for skill prompts (compatible with Anthropic API).
 */
export type SkillContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

/**
 * Bundled skill definition.
 *
 * Inspired by Claude Code's skill system. Skills provide specialized
 * capabilities by injecting context-specific prompts with optional
 * tool restrictions and model overrides.
 */
export interface SkillDefinition {
  /** Unique skill name (e.g., 'simplify', 'commit') */
  name: string

  /** Human-readable description */
  description: string

  /** Alternative names for the skill */
  aliases?: string[]

  /** When the model should invoke this skill (used in system prompt) */
  whenToUse?: string

  /** Hint for expected arguments */
  argumentHint?: string

  /** Tools the skill is allowed to use (empty = all tools) */
  allowedTools?: string[]

  /** Model override for this skill */
  model?: string

  /** Whether the skill can be invoked by users via /command */
  userInvocable?: boolean

  /** Runtime check for availability */
  isEnabled?: () => boolean

  /** Hook overrides while skill is active */
  hooks?: HookConfig

  /** Execution context: 'inline' runs in current context, 'fork' spawns a subagent */
  context?: 'inline' | 'fork'

  /** Subagent type for forked execution */
  agent?: string

  /**
   * Generate the prompt content blocks for this skill.
   *
   * @param args - User-provided arguments (e.g., from "/simplify focus on error handling")
   * @param context - Tool execution context (cwd, etc.)
   * @returns Content blocks to inject into the conversation
   */
  getPrompt: (
    args: string,
    context: ToolContext,
  ) => Promise<SkillContentBlock[]>
}

/**
 * Result of executing a skill.
 */
export interface SkillResult {
  /** Whether execution succeeded */
  success: boolean

  /** Skill name that was executed */
  skillName: string

  /** Execution status */
  status: 'inline' | 'forked'

  /** Allowed tools override (for inline execution) */
  allowedTools?: string[]

  /** Model override */
  model?: string

  /** Result text (for forked execution) */
  result?: string

  /** Error message */
  error?: string
}
