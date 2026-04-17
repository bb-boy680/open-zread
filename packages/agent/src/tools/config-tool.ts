/**
 * ConfigTool - Dynamic configuration management
 *
 * Get/set global configuration and session settings.
 */

import type { ToolDefinition, ToolResult, ToolInputParams } from '../types.js'
import { getString, getValue } from './types.js'

// In-memory config store
const configStore = new Map<string, unknown>()

/**
 * Get a config value.
 */
export function getConfig(key: string): unknown {
  return configStore.get(key)
}

/**
 * Set a config value.
 */
export function setConfig(key: string, value: unknown): void {
  configStore.set(key, value)
}

/**
 * Clear all config.
 */
export function clearConfig(): void {
  configStore.clear()
}

export const ConfigTool: ToolDefinition = {
  name: 'Config',
  description: 'Get or set configuration values. Supports session-scoped settings.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get', 'set', 'list'],
        description: 'Operation to perform',
      },
      key: { type: 'string', description: 'Config key' },
      value: { description: 'Config value (for set)' },
    },
    required: ['action'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Manage configuration settings.' },
  async call(input: ToolInputParams): Promise<ToolResult> {
    const actionStr = getString(input, 'action')
    const key = getString(input, 'key')
    const value = getValue(input, 'value')

    if (!actionStr) {
      return { type: 'tool_result', tool_use_id: '', content: 'action is required', is_error: true }
    }

    const validActions = ['get', 'set', 'list'] as const
    const action = validActions.includes(actionStr as typeof validActions[number])
      ? actionStr as 'get' | 'set' | 'list'
      : null

    if (!action) {
      return { type: 'tool_result', tool_use_id: '', content: `Invalid action: ${actionStr}. Must be one of: get, set, list`, is_error: true }
    }

    switch (action) {
      case 'get': {
        if (!key) {
          return { type: 'tool_result', tool_use_id: '', content: 'key required for get', is_error: true }
        }
        const storedValue = configStore.get(key)
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: storedValue !== undefined ? JSON.stringify(storedValue) : `Config key "${key}" not found`,
        }
      }
      case 'set': {
        if (!key) {
          return { type: 'tool_result', tool_use_id: '', content: 'key required for set', is_error: true }
        }
        configStore.set(key, value)
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: `Config set: ${key} = ${JSON.stringify(value)}`,
        }
      }
      case 'list': {
        const entries = Array.from(configStore.entries())
        if (entries.length === 0) {
          return { type: 'tool_result', tool_use_id: '', content: 'No config values set.' }
        }
        const lines = entries.map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
        return { type: 'tool_result', tool_use_id: '', content: lines.join('\n') }
      }
      default:
        return { type: 'tool_result', tool_use_id: '', content: `Unknown action: ${action}`, is_error: true }
    }
  },
}
