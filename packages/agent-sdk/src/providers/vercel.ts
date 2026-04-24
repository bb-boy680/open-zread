import { generateText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type {
  LLMProvider,
  CreateMessageParams,
  CreateMessageResponse,
  NormalizedMessageParam,
  NormalizedTool,
  NormalizedResponseBlock,
} from './types.js'
import type { ToolInputParams } from '../types.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vercel AI SDK ToolSet type is complex
type ToolSetLike = Record<string, any>

export class VercelAIProvider implements LLMProvider {
  readonly apiType = 'anthropic-messages' as const

  private providerId: string
  private apiKey: string
  private baseURL?: string

  constructor(opts: { providerId: string; apiKey: string; baseURL?: string }) {
    this.providerId = opts.providerId
    this.apiKey = opts.apiKey
    this.baseURL = opts.baseURL
  }

  async createMessage(params: CreateMessageParams): Promise<CreateMessageResponse> {
    const model = this.getModel(params.model)
    const messages = this.convertMessages(params.system, params.messages)
    const tools = params.tools ? this.convertTools(params.tools) : undefined

    // 使用 generateText 获取完整响应
    const result = await generateText({
      model,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vercel AI SDK ToolSet type compatibility
      tools: tools as any,
      stopWhen: stepCountIs(10), // 支持多步工具调用
    })

    // 构建响应
    const content: NormalizedResponseBlock[] = []

    if (result.text) {
      content.push({ type: 'text', text: result.text })
    }

    // 从 steps 中提取 tool calls
    for (const step of result.steps) {
      for (const toolCall of step.toolCalls ?? []) {
        content.push({
          type: 'tool_use',
          id: toolCall.toolCallId,
          name: toolCall.toolName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- toolCall.input type varies
          input: (toolCall as any).input as ToolInputParams,
        })
      }
    }

    if (content.length === 0) {
      content.push({ type: 'text', text: '' })
    }

    const stopReason = this.mapFinishReason(result.finishReason)

    return {
      content,
      stopReason,
      usage: {
        input_tokens: result.usage?.inputTokens ?? 0,
        output_tokens: result.usage?.outputTokens ?? 0,
      },
    }
  }

  private getModel(modelId: string) {
    if (this.providerId === 'anthropic') {
      return anthropic(modelId)
    }
    if (this.providerId === 'openai') {
      return openai(modelId)
    }

    const baseURL = this.baseURL || this.getDefaultBaseURL()
    const provider = createOpenAICompatible({
      name: this.providerId,
      baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })
    // Return a model instance
    return provider(modelId)
  }

  private getDefaultBaseURL(): string {
    const defaults: Record<string, string> = {
      deepseek: 'https://api.deepseek.com/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      moonshot: 'https://api.moonshot.cn/v1',
      minimax: 'https://api.minimax.chat/v1',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    }
    return defaults[this.providerId] || ''
  }

  private convertMessages(system: string, messages: NormalizedMessageParam[]): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const result: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    if (system) {
      result.push({ role: 'system', content: system })
    }

    for (const msg of messages) {
      const content = typeof msg.content === 'string'
        ? msg.content
        : this.extractText(msg.content)
      result.push({ role: msg.role, content })
    }

    return result
  }

  private extractText(content: NormalizedMessageParam['content']): string {
    if (typeof content === 'string') return content

    const parts: string[] = []
    for (const block of content) {
      if (block.type === 'text') parts.push(block.text)
      else if (block.type === 'tool_result') parts.push(`Tool result: ${block.content}`)
    }
    return parts.join('\n')
  }

  private convertTools(tools: NormalizedTool[]): ToolSetLike {
    const toolSet: ToolSetLike = {}
    for (const t of tools) {
      toolSet[t.name] = {
        description: t.description,
        parameters: t.input_schema,
      }
    }
    return toolSet
  }

  private mapFinishReason(reason: string | undefined): 'end_turn' | 'max_tokens' | 'tool_use' | string {
    switch (reason) {
      case 'stop': return 'end_turn'
      case 'length': return 'max_tokens'
      case 'tool-calls': return 'tool_use'
      default: return reason || 'end_turn'
    }
  }
}