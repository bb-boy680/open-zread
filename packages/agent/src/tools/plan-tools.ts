/**
 * Plan Mode Tools
 *
 * EnterPlanMode / ExitPlanMode - Structured planning workflow.
 * Allows the agent to enter a design/planning phase before execution.
 */

import type { ToolDefinition, ToolResult } from '../types.js'

// Track plan mode state
let planModeActive = false
let currentPlan: string | null = null

export function isPlanModeActive(): boolean {
  return planModeActive
}

export function getCurrentPlan(): string | null {
  return currentPlan
}

export const EnterPlanModeTool: ToolDefinition = {
  name: 'EnterPlanMode',
  description: 'Enter plan/design mode for complex tasks. In plan mode, the agent focuses on designing the approach before executing.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Enter plan mode for structured planning.' },
  async call(): Promise<ToolResult> {
    if (planModeActive) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: 'Already in plan mode.',
      }
    }

    planModeActive = true
    currentPlan = null

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: 'Entered plan mode. Design your approach before executing. Use ExitPlanMode when the plan is ready.',
    }
  },
}

export const ExitPlanModeTool: ToolDefinition = {
  name: 'ExitPlanMode',
  description: 'Exit plan mode with a completed plan. The plan will be recorded and execution can proceed.',
  inputSchema: {
    type: 'object',
    properties: {
      plan: { type: 'string', description: 'The completed plan' },
      approved: { type: 'boolean', description: 'Whether the plan is approved for execution' },
    },
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Exit plan mode with a completed plan.' },
  async call(input: any): Promise<ToolResult> {
    if (!planModeActive) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: 'Not in plan mode.',
        is_error: true,
      }
    }

    planModeActive = false
    currentPlan = input.plan || null

    const status = input.approved !== false ? 'approved' : 'pending approval'

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Plan mode exited. Plan status: ${status}.${currentPlan ? `\n\nPlan:\n${currentPlan}` : ''}`,
    }
  },
}
