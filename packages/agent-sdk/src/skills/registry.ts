/**
 * Skill Registry
 *
 * Central registry for managing skill definitions.
 * Skills can be registered programmatically or loaded from bundled definitions.
 */

import type { SkillDefinition } from './types.js'

/** Internal skill store */
const skills: Map<string, SkillDefinition> = new Map()

/** Alias -> skill name mapping */
const aliases: Map<string, string> = new Map()

/**
 * Register a skill definition.
 */
export function registerSkill(definition: SkillDefinition): void {
  skills.set(definition.name, definition)

  // Register aliases
  if (definition.aliases) {
    for (const alias of definition.aliases) {
      aliases.set(alias, definition.name)
    }
  }
}

/**
 * Get a skill by name or alias.
 */
export function getSkill(name: string): SkillDefinition | undefined {
  // Direct lookup
  const direct = skills.get(name)
  if (direct) return direct

  // Alias lookup
  const resolved = aliases.get(name)
  if (resolved) return skills.get(resolved)

  return undefined
}

/**
 * Get all registered skills.
 */
export function getAllSkills(): SkillDefinition[] {
  return Array.from(skills.values())
}

/**
 * Get all user-invocable skills (for /command listing).
 */
export function getUserInvocableSkills(): SkillDefinition[] {
  return getAllSkills().filter(
    (s) => s.userInvocable !== false && (!s.isEnabled || s.isEnabled()),
  )
}

/**
 * Check if a skill exists.
 */
export function hasSkill(name: string): boolean {
  return skills.has(name) || aliases.has(name)
}

/**
 * Remove a skill.
 */
export function unregisterSkill(name: string): boolean {
  const skill = skills.get(name)
  if (!skill) return false

  // Remove aliases
  if (skill.aliases) {
    for (const alias of skill.aliases) {
      aliases.delete(alias)
    }
  }

  return skills.delete(name)
}

/**
 * Clear all skills (for testing).
 */
export function clearSkills(): void {
  skills.clear()
  aliases.clear()
}

/**
 * Format skills listing for system prompt injection.
 *
 * Uses a budget system: skills listing gets a limited character budget
 * to avoid bloating the context window.
 */
export function formatSkillsForPrompt(
  contextWindowTokens?: number,
): string {
  const invocable = getUserInvocableSkills()
  if (invocable.length === 0) return ''

  // Budget: 1% of context window in characters (4 chars per token)
  const CHARS_PER_TOKEN = 4
  const DEFAULT_BUDGET = 8000
  const MAX_DESC_CHARS = 250
  const budget = contextWindowTokens
    ? Math.floor(contextWindowTokens * 0.01 * CHARS_PER_TOKEN)
    : DEFAULT_BUDGET

  const lines: string[] = []
  let used = 0

  for (const skill of invocable) {
    const desc = skill.description.length > MAX_DESC_CHARS
      ? skill.description.slice(0, MAX_DESC_CHARS) + '...'
      : skill.description

    const trigger = skill.whenToUse
      ? ` TRIGGER when: ${skill.whenToUse}`
      : ''

    const line = `- ${skill.name}: ${desc}${trigger}`

    if (used + line.length > budget) break
    lines.push(line)
    used += line.length
  }

  return lines.join('\n')
}
