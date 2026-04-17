/**
 * SendMessageTool - Inter-agent messaging
 *
 * Supports plain text and structured protocol messages
 * between teammates in a multi-agent setup.
 */

import type { ToolDefinition, ToolResult, ToolInputParams } from '../types.js'
import { getRequiredString, getString } from './types.js'

/**
 * Message inbox for inter-agent communication.
 */
export interface AgentMessage {
  from: string
  to: string
  content: string
  timestamp: string
  type: 'text' | 'shutdown_request' | 'shutdown_response' | 'plan_approval_response'
}

const mailboxes = new Map<string, AgentMessage[]>()

/**
 * Read messages from a mailbox.
 */
export function readMailbox(agentName: string): AgentMessage[] {
  const messages = mailboxes.get(agentName) || []
  mailboxes.set(agentName, []) // Clear after reading
  return messages
}

/**
 * Write to a mailbox.
 */
export function writeToMailbox(agentName: string, message: AgentMessage): void {
  const messages = mailboxes.get(agentName) || []
  messages.push(message)
  mailboxes.set(agentName, messages)
}

/**
 * Clear all mailboxes.
 */
export function clearMailboxes(): void {
  mailboxes.clear()
}

export const SendMessageTool: ToolDefinition = {
  name: 'SendMessage',
  description: 'Send a message to another agent or teammate. Supports plain text and structured protocol messages.',
  inputSchema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient agent name or ID. Use "*" for broadcast.' },
      content: { type: 'string', description: 'Message content' },
      type: {
        type: 'string',
        enum: ['text', 'shutdown_request', 'shutdown_response', 'plan_approval_response'],
        description: 'Message type (default: text)',
      },
    },
    required: ['to', 'content'],
  },
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Send a message to another agent.' },
  async call(input: ToolInputParams): Promise<ToolResult> {
    const to = getRequiredString(input, 'to')
    const content = getRequiredString(input, 'content')
    const typeStr = getString(input, 'type') || 'text'

    const message: AgentMessage = {
      from: 'self',
      to,
      content,
      timestamp: new Date().toISOString(),
      type: typeStr as AgentMessage['type'],
    }

    if (to === '*') {
      // Broadcast to all known mailboxes
      for (const [name] of mailboxes) {
        writeToMailbox(name, { ...message, to: name })
      }
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Message broadcast to all agents`,
      }
    }

    writeToMailbox(to, message)
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Message sent to ${to}`,
    }
  },
}
