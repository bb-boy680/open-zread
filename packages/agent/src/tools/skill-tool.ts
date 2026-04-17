/**
 * Skill Tool
 *
 * Allows the model to invoke registered skills by name.
 * Skills are prompt templates that provide specialized capabilities.
 */

import type { ToolDefinition, ToolResult, ToolContext, ToolInputParams } from '../types.js'
import { getSkill, getUserInvocableSkills } from '../skills/registry.js'
import { getRequiredString, getString } from './types.js'

export const SkillTool: ToolDefinition = {
  name: 'Skill',
  description:
    'Execute a skill within the current conversation. ' +
    'Skills provide specialized capabilities and domain knowledge. ' +
    'Use this tool with the skill name and optional arguments. ' +
    'Available skills are listed in system-reminder messages.',
  inputSchema: {
    type: 'object',
    properties: {
      skill: {
        type: 'string',
        description: 'The skill name to execute (e.g., "commit", "review", "simplify")',
      },
      args: {
        type: 'string',
        description: 'Optional arguments for the skill',
      },
    },
    required: ['skill'],
  },

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => getUserInvocableSkills().length > 0,

  async prompt(): Promise<string> {
    const skills = getUserInvocableSkills()
    if (skills.length === 0) return ''

    const lines = skills.map((s) => {
      const desc =
        s.description.length > 200
          ? s.description.slice(0, 200) + '...'
          : s.description
      return `- ${s.name}: ${desc}`
    })

    return (
      'Execute a skill within the main conversation.\n\n' +
      'Available skills:\n' +
      lines.join('\n') +
      '\n\nWhen a skill matches the user\'s request, invoke it using the Skill tool.'
    )
  },

  async call(input: ToolInputParams, context: ToolContext): Promise<ToolResult> {
    const skillName = getRequiredString(input, 'skill')
    const args = getString(input, 'args') ?? ''

    if (!skillName) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: 'Error: skill name is required',
        is_error: true,
      }
    }

    const skill = getSkill(skillName)
    if (!skill) {
      const available = getUserInvocableSkills()
        .map((s) => s.name)
        .join(', ')
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Error: Unknown skill "${skillName}". Available skills: ${available || 'none'}`,
        is_error: true,
      }
    }

    // Check if skill is enabled
    if (skill.isEnabled && !skill.isEnabled()) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Error: Skill "${skillName}" is currently disabled`,
        is_error: true,
      }
    }

    try {
      // Get skill prompt
      const contentBlocks = await skill.getPrompt(args, context)

      // Convert content blocks to text
      const promptText = contentBlocks
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('\n\n')

      // Build result with metadata
      const result: Record<string, unknown> = {
        success: true,
        commandName: skill.name,
        status: skill.context === 'fork' ? 'forked' : 'inline',
        prompt: promptText,
      }

      if (skill.allowedTools) {
        result.allowedTools = skill.allowedTools
      }

      if (skill.model) {
        result.model = skill.model
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify(result),
      }
    } catch (err: unknown) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Error executing skill "${skillName}": ${err instanceof Error ? err.message : String(err)}`,
        is_error: true,
      }
    }
  },
}
