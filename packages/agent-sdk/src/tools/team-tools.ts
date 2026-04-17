/**
 * Team Management Tools
 *
 * TeamCreate, TeamDelete - Multi-agent team coordination.
 * Manages team composition, task lists, and inter-agent messaging.
 */

import type { ToolDefinition, ToolResult, ToolInputParams } from '../types.js'
import { getRequiredString, getArray } from './types.js'

/**
 * Team definition.
 */
export interface Team {
  id: string
  name: string
  members: string[]
  leaderId: string
  taskListId?: string
  createdAt: string
  status: 'active' | 'disbanded'
}

/**
 * Global team store.
 */
const teamStore = new Map<string, Team>()
let teamCounter = 0

/**
 * Get all teams.
 */
export function getAllTeams(): Team[] {
  return Array.from(teamStore.values())
}

/**
 * Get a team by ID.
 */
export function getTeam(id: string): Team | undefined {
  return teamStore.get(id)
}

/**
 * Clear all teams.
 */
export function clearTeams(): void {
  teamStore.clear()
  teamCounter = 0
}

// ============================================================================
// TeamCreateTool
// ============================================================================

export const TeamCreateTool: ToolDefinition = {
  name: 'TeamCreate',
  description: 'Create a multi-agent team for coordinated work. Assigns a lead and manages member composition.',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Team name' },
      members: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of agent/teammate names',
      },
      task_description: { type: 'string', description: 'Description of the team\'s mission' },
    },
    required: ['name'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Create a team for multi-agent coordination.' },
  async call(input: ToolInputParams): Promise<ToolResult> {
    const id = `team_${++teamCounter}`
    const team: Team = {
      id,
      name: getRequiredString(input, 'name'),
      members: getArray<string>(input, 'members') ?? [],
      leaderId: 'self',
      createdAt: new Date().toISOString(),
      status: 'active',
    }
    teamStore.set(id, team)

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Team created: ${id} "${team.name}" with ${team.members.length} members`,
    }
  },
}

// ============================================================================
// TeamDeleteTool
// ============================================================================

export const TeamDeleteTool: ToolDefinition = {
  name: 'TeamDelete',
  description: 'Disband a team and clean up resources.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Team ID to disband' },
    },
    required: ['id'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Delete/disband a team.' },
  async call(input: ToolInputParams): Promise<ToolResult> {
    const id = getRequiredString(input, 'id')
    const team = teamStore.get(id)
    if (!team) {
      return { type: 'tool_result', tool_use_id: '', content: `Team not found: ${id}`, is_error: true }
    }

    team.status = 'disbanded'
    teamStore.delete(id)

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Team disbanded: ${team.name}`,
    }
  },
}
