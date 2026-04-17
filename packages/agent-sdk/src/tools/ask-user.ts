/**
 * AskUserQuestionTool - Interactive user questions
 *
 * In SDK mode, returns a permission_request event and waits
 * for the consumer to provide an answer.
 * In non-interactive mode, returns a default or denies.
 */

import type { ToolDefinition, ToolInputParams, ToolResult } from '../types.js'
import { getRequiredString, getArray } from './types.js'

// Callback for handling user questions (set by the agent)
let questionHandler: ((question: string, options?: string[]) => Promise<string>) | null = null

/**
 * Set the question handler for AskUserQuestion.
 */
export function setQuestionHandler(
  handler: (question: string, options?: string[]) => Promise<string>,
): void {
  questionHandler = handler
}

/**
 * Clear the question handler.
 */
export function clearQuestionHandler(): void {
  questionHandler = null
}

export const AskUserQuestionTool: ToolDefinition = {
  name: 'AskUserQuestion',
  description: 'Ask the user a question and wait for their response. Use when you need clarification or input from the user.',
  inputSchema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The question to ask the user' },
      options: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of choices for the user',
      },
      allow_multiselect: {
        type: 'boolean',
        description: 'Whether to allow multiple selections (for options)',
      },
    },
    required: ['question'],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => false,
  isEnabled: () => true,
  async prompt() { return 'Ask the user a question.' },
  async call(input: ToolInputParams): Promise<ToolResult> {
    const question = getRequiredString(input, 'question')
    const options = getArray<string>(input, 'options')

    if (questionHandler) {
      try {
        const answer = await questionHandler(question, options)
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: answer,
        }
      } catch (err: unknown) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: `User declined to answer: ${err instanceof Error ? err.message : String(err)}`,
          is_error: true,
        }
      }
    }

    // Non-interactive: return informative message
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `[Non-interactive mode] Question: ${question}${options ? `\nOptions: ${options.join(', ')}` : ''}\n\nNo user available to answer. Proceeding with best judgment.`,
    }
  },
}
