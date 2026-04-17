/**
 * tool() helper - Create tools using Zod schemas
 *
 * Compatible with open-agent-sdk's tool() function.
 *
 * Usage:
 *   import { tool } from 'open-agent-sdk'
 *   import { z } from 'zod'
 *
 *   const weatherTool = tool(
 *     'get_weather',
 *     'Get weather for a city',
 *     { city: z.string().describe('City name') },
 *     async ({ city }) => {
 *       return { content: [{ type: 'text', text: `Weather in ${city}: 22°C` }] }
 *     }
 *   )
 */

import { z, type ZodRawShape, type ZodObject } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ToolDefinition, ToolResult, ToolContext, ToolInputParams, ToolInputSchemaProperty } from './types.js'

/**
 * Tool annotations (MCP standard).
 */
export interface ToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

/**
 * Tool call result (MCP-compatible).
 */
export interface CallToolResult {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; resource: { uri: string; text?: string; blob?: string } }
  >
  isError?: boolean
}

/**
 * SDK MCP tool definition.
 */
export interface SdkMcpToolDefinition<T extends ZodRawShape = ZodRawShape> {
  name: string
  description: string
  inputSchema: ZodObject<T>
  handler: (args: z.infer<ZodObject<T>>, extra: unknown) => Promise<CallToolResult>
  annotations?: ToolAnnotations
}

/**
 * Create a tool using Zod schema.
 *
 * Compatible with open-agent-sdk's tool() function.
 */
export function tool<T extends ZodRawShape>(
  name: string,
  description: string,
  inputSchema: T,
  handler: (args: z.infer<ZodObject<T>>, extra: unknown) => Promise<CallToolResult>,
  extras?: { annotations?: ToolAnnotations },
): SdkMcpToolDefinition<T> {
  return {
    name,
    description,
    inputSchema: z.object(inputSchema),
    handler,
    annotations: extras?.annotations,
  }
}

/**
 * Convert an SdkMcpToolDefinition to a ToolDefinition for the engine.
 */
export function sdkToolToToolDefinition<T extends ZodRawShape>(
  sdkTool: SdkMcpToolDefinition<T>
): ToolDefinition {
  // zodToJsonSchema returns JSON Schema Draft 7 format
  const jsonSchema = zodToJsonSchema(sdkTool.inputSchema, { target: 'openApi3' }) as {
    type?: string
    properties?: Record<string, ToolInputSchemaProperty>
    required?: string[]
  }

  return {
    name: sdkTool.name,
    description: sdkTool.description,
    inputSchema: {
      type: 'object',
      properties: jsonSchema.properties || {},
      required: jsonSchema.required || [],
    },
    isReadOnly: () => sdkTool.annotations?.readOnlyHint ?? false,
    isConcurrencySafe: () => sdkTool.annotations?.readOnlyHint ?? false,
    isEnabled: () => true,
    async prompt() { return sdkTool.description },
    async call(input: ToolInputParams, _context: ToolContext): Promise<ToolResult> {
      try {
        const parsed = sdkTool.inputSchema.parse(input)
        const result = await sdkTool.handler(parsed, {})

        // Convert MCP content blocks to string
        const text = result.content
          .map((block) => {
            if (block.type === 'text') return block.text
            if (block.type === 'image') return `[Image: ${block.mimeType}]`
            if (block.type === 'resource') return block.resource.text || `[Resource: ${block.resource.uri}]`
            return JSON.stringify(block)
          })
          .join('\n')

        return {
          type: 'tool_result',
          tool_use_id: '',
          content: text,
          is_error: result.isError || false,
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: `Error: ${message}`,
          is_error: true,
        }
      }
    },
  }
}
