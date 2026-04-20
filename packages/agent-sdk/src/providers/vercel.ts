import { streamText } from 'ai'
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

    // 使用 streamText 获取完整响应
    const stream = await streamText({
      model,
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vercel AI SDK ToolSet type compatibility
      tools: tools as any,
      maxTokens: params.maxTokens,
    })

    // 等待流完成，收集完整响应
    const result = await stream.text
    const usage = await stream.usage

    // 提取 tool calls
    const toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = []
    for await (const part of stream.fullStream) {
      if (part.type === 'tool-call') {
        toolCalls.push({
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args,
        })
      }
    }

    // 构建响应
    const content: NormalizedResponseBlock[] = []

    if (result) {
      content.push({ type: 'text', text: result })
    }

    for (const tc of toolCalls) {
      content.push({
        type: 'tool_use',
        id: tc.toolCallId,
        name: tc.toolName,
        input: tc.args as ToolInputParams,
      })
    }

    if (content.length === 0) {
      content.push({ type: 'text', text: '' })
    }

    const finishReason = await stream.finishReason
    const stopReason = this.mapFinishReason(finishReason)

    return {
      content,
      stopReason,
      usage: {
        input_tokens: usage?.promptTokens || 0,
        output_tokens: usage?.completionTokens || 0,
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