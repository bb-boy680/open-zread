/**
 * Task Management Tools
 *
 * TaskCreate, TaskList, TaskUpdate, TaskGet, TaskStop, TaskOutput
 *
 * Provides in-memory task tracking for agent coordination.
 * Tasks persist across turns within a session.
 */

import type { ToolDefinition, ToolResult } from '../types.js'

/**
 * Task status.
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

/**
 * Task entry.
 */
export interface Task {
  id: string
  subject: string
  description?: string
  status: TaskStatus
  owner?: string
  createdAt: string
  updatedAt: string
  output?: string
  blockedBy?: string[]
  blocks?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Global task store (shared across tools in a session).
 */
const taskStore = new Map<string, Task>()

let taskCounter = 0

/**
 * Get all tasks.
 */
export function getAllTasks(): Task[] {
  return Array.from(taskStore.values())
}

/**
 * Get a task by ID.
 */
export function getTask(id: string): Task | undefined {
  return taskStore.get(id)
}

/**
 * Clear all tasks (for session reset).
 */
export function clearTasks(): void {
  taskStore.clear()
  taskCounter = 0
}

// ============================================================================
// TaskCreateTool
// ============================================================================

export const TaskCreateTool: ToolDefinition = {
  name: 'TaskCreate',
  description: 'Create a new task for tracking work progress. Tasks help organize multi-step operations.',
  inputSchema: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Short task title' },
      description: { type: 'string', description: 'Detailed task description' },
      owner: { type: 'string', description: 'Task owner/assignee' },
      status: { type: 'string', enum: ['pending', 'in_progress'], description: 'Initial status' },
    },
    required: ['subject'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Create a task for tracking progress.' },
  async call(input: any): Promise<ToolResult> {
    const id = `task_${++taskCounter}`
    const task: Task = {
      id,
      subject: input.subject,
      description: input.description,
      status: input.status || 'pending',
      owner: input.owner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    taskStore.set(id, task)

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Task created: ${id} - "${task.subject}" (${task.status})`,
    }
  },
}

// ============================================================================
// TaskListTool
// ============================================================================

export const TaskListTool: ToolDefinition = {
  name: 'TaskList',
  description: 'List all tasks with their status, ownership, and dependencies.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status' },
      owner: { type: 'string', description: 'Filter by owner' },
    },
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'List tasks.' },
  async call(input: any): Promise<ToolResult> {
    let tasks = getAllTasks()

    if (input.status) {
      tasks = tasks.filter(t => t.status === input.status)
    }
    if (input.owner) {
      tasks = tasks.filter(t => t.owner === input.owner)
    }

    if (tasks.length === 0) {
      return { type: 'tool_result', tool_use_id: '', content: 'No tasks found.' }
    }

    const lines = tasks.map(t =>
      `[${t.id}] ${t.status.toUpperCase()} - ${t.subject}${t.owner ? ` (owner: ${t.owner})` : ''}`
    )

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: lines.join('\n'),
    }
  },
}

// ============================================================================
// TaskUpdateTool
// ============================================================================

export const TaskUpdateTool: ToolDefinition = {
  name: 'TaskUpdate',
  description: 'Update a task\'s status, description, or other properties.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Task ID' },
      status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'] },
      description: { type: 'string', description: 'Updated description' },
      owner: { type: 'string', description: 'New owner' },
      output: { type: 'string', description: 'Task output/result' },
    },
    required: ['id'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Update a task.' },
  async call(input: any): Promise<ToolResult> {
    const task = taskStore.get(input.id)
    if (!task) {
      return { type: 'tool_result', tool_use_id: '', content: `Task not found: ${input.id}`, is_error: true }
    }

    if (input.status) task.status = input.status
    if (input.description) task.description = input.description
    if (input.owner) task.owner = input.owner
    if (input.output) task.output = input.output
    task.updatedAt = new Date().toISOString()

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Task updated: ${task.id} - ${task.status} - "${task.subject}"`,
    }
  },
}

// ============================================================================
// TaskGetTool
// ============================================================================

export const TaskGetTool: ToolDefinition = {
  name: 'TaskGet',
  description: 'Get full details of a specific task.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Task ID' },
    },
    required: ['id'],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Get task details.' },
  async call(input: any): Promise<ToolResult> {
    const task = taskStore.get(input.id)
    if (!task) {
      return { type: 'tool_result', tool_use_id: '', content: `Task not found: ${input.id}`, is_error: true }
    }

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: JSON.stringify(task, null, 2),
    }
  },
}

// ============================================================================
// TaskStopTool
// ============================================================================

export const TaskStopTool: ToolDefinition = {
  name: 'TaskStop',
  description: 'Stop/cancel a running task.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Task ID to stop' },
      reason: { type: 'string', description: 'Reason for stopping' },
    },
    required: ['id'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Stop a task.' },
  async call(input: any): Promise<ToolResult> {
    const task = taskStore.get(input.id)
    if (!task) {
      return { type: 'tool_result', tool_use_id: '', content: `Task not found: ${input.id}`, is_error: true }
    }

    task.status = 'cancelled'
    task.updatedAt = new Date().toISOString()
    if (input.reason) task.output = `Stopped: ${input.reason}`

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Task stopped: ${task.id}`,
    }
  },
}

// ============================================================================
// TaskOutputTool
// ============================================================================

export const TaskOutputTool: ToolDefinition = {
  name: 'TaskOutput',
  description: 'Get the output/result of a task.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Task ID' },
    },
    required: ['id'],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Get task output.' },
  async call(input: any): Promise<ToolResult> {
    const task = taskStore.get(input.id)
    if (!task) {
      return { type: 'tool_result', tool_use_id: '', content: `Task not found: ${input.id}`, is_error: true }
    }

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: task.output || '(no output yet)',
    }
  },
}
