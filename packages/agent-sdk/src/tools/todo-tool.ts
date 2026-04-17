/**
 * TodoWriteTool - Session todo/checklist management
 *
 * Manages a session-scoped todo list for tracking work items.
 */

import type { ToolDefinition, ToolResult, ToolInputParams, ToolContext } from '../types.js'

export interface TodoItem {
  id: number
  text: string
  done: boolean
  priority?: 'high' | 'medium' | 'low'
}

const todoList: TodoItem[] = []
let todoCounter = 0

/**
 * Get all todos.
 */
export function getTodos(): TodoItem[] {
  return [...todoList]
}

/**
 * Clear all todos.
 */
export function clearTodos(): void {
  todoList.length = 0
  todoCounter = 0
}

export const TodoWriteTool: ToolDefinition = {
  name: 'TodoWrite',
  description: 'Manage a session todo/checklist. Supports add, toggle, remove, and list operations.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['add', 'toggle', 'remove', 'list', 'clear'],
        description: 'Operation to perform',
      },
      text: { type: 'string', description: 'Todo item text (for add)' },
      id: { type: 'number', description: 'Todo item ID (for toggle/remove)' },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Priority level (for add)',
      },
    },
    required: ['action'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Manage session todo list.' },
  async call(input: ToolInputParams, _context: ToolContext): Promise<ToolResult> {
    const action = input.action as 'add' | 'toggle' | 'remove' | 'list' | 'clear'
    switch (action) {
      case 'add': {
        if (!input.text) {
          return { type: 'tool_result', tool_use_id: '', content: 'text required', is_error: true }
        }
        const item: TodoItem = {
          id: ++todoCounter,
          text: String(input.text),
          done: false,
          priority: input.priority as 'high' | 'medium' | 'low' | undefined,
        }
        todoList.push(item)
        return { type: 'tool_result', tool_use_id: '', content: `Todo added: #${item.id} "${item.text}"` }
      }

      case 'toggle': {
        const id = Number(input.id)
        const item = todoList.find(t => t.id === id)
        if (!item) {
          return { type: 'tool_result', tool_use_id: '', content: `Todo #${id} not found`, is_error: true }
        }
        item.done = !item.done
        return { type: 'tool_result', tool_use_id: '', content: `Todo #${item.id} ${item.done ? 'completed' : 'reopened'}` }
      }

      case 'remove': {
        const id = Number(input.id)
        const idx = todoList.findIndex(t => t.id === id)
        if (idx === -1) {
          return { type: 'tool_result', tool_use_id: '', content: `Todo #${id} not found`, is_error: true }
        }
        todoList.splice(idx, 1)
        return { type: 'tool_result', tool_use_id: '', content: `Todo #${id} removed` }
      }

      case 'list': {
        if (todoList.length === 0) {
          return { type: 'tool_result', tool_use_id: '', content: 'No todos.' }
        }
        const lines = todoList.map(t =>
          `${t.done ? '[x]' : '[ ]'} #${t.id} ${t.text}${t.priority ? ` (${t.priority})` : ''}`
        )
        return { type: 'tool_result', tool_use_id: '', content: lines.join('\n') }
      }

      case 'clear': {
        todoList.length = 0
        return { type: 'tool_result', tool_use_id: '', content: 'All todos cleared.' }
      }

      default:
        return { type: 'tool_result', tool_use_id: '', content: `Unknown action: ${input.action}`, is_error: true }
    }
  },
}
