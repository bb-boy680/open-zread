/**
 * MCP Client - Connect to Model Context Protocol servers
 */

import type { ToolDefinition, McpServerConfig, ToolResult, ToolInputParams } from '../types.js'

export interface MCPConnection {
  name: string
  status: 'connected' | 'disconnected' | 'error'
  tools: ToolDefinition[]
  close: () => Promise<void>
}

/**
 * Connect to an MCP server and fetch its tools.
 */
export async function connectMCPServer(
  name: string,
  config: McpServerConfig,
): Promise<MCPConnection> {
  try {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')

    // Use unknown for transport to avoid SDK type complexity
    let transport: unknown

    if (!config.type || config.type === 'stdio') {
      const stdioConfig = config as { command: string; args?: string[]; env?: Record<string, string> }
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js')
      transport = new StdioClientTransport({
        command: stdioConfig.command,
        args: stdioConfig.args || [],
        env: { ...process.env, ...stdioConfig.env } as Record<string, string>,
      })
    } else if (config.type === 'sse') {
      const sseConfig = config as { url: string; headers?: Record<string, string> }
      const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js')
      transport = new SSEClientTransport(
        new URL(sseConfig.url),
        sseConfig.headers ? { requestInit: { headers: sseConfig.headers } } : undefined,
      )
    } else if (config.type === 'http') {
      const httpConfig = config as { url: string; headers?: Record<string, string> }
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
      transport = new StreamableHTTPClientTransport(
        new URL(httpConfig.url),
        httpConfig.headers ? { requestInit: { headers: httpConfig.headers } } : undefined,
      )
    } else {
      const sdkConfig = config as { type: string }
      throw new Error(`Unsupported MCP transport type: ${sdkConfig.type}`)
    }

    // MCP SDK Client has complex dynamic types - use unknown with explicit operations
     
    const client = new Client(
      { name: `agent-sdk-${name}`, version: '1.0.0' },
      { capabilities: {} },
    ) as unknown

    // Connect to transport
    await (client as MCPClient).connect(transport)

    // Fetch available tools
    const toolList = await (client as MCPClient).listTools()
    const tools: ToolDefinition[] = (toolList.tools || []).map((mcpTool) =>
      createMCPToolDefinition(name, mcpTool, client as MCPClient),
    )

    return {
      name,
      status: 'connected',
      tools,
      async close() {
        try {
          await (client as MCPClient).close()
        } catch {
          // ignore close errors
        }
      },
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[MCP] Failed to connect to "${name}": ${message}`)
    return {
      name,
      status: 'error',
      tools: [],
      async close() {},
    }
  }
}

// MCP SDK client interface for type-safe operations
interface MCPClient {
  connect(transport: unknown): Promise<void>
  listTools(): Promise<{ tools: MCPToolInfo[] }>
  callTool(params: { name: string; arguments: unknown }): Promise<{
    content?: Array<{ type: string; text?: string }>
    isError?: boolean
  }>
  close(): Promise<void>
}

// MCP SDK tool info structure
interface MCPToolInfo {
  name: string
  description?: string
  inputSchema?: ToolDefinition['inputSchema']
}

/**
 * Create a ToolDefinition wrapping an MCP server tool.
 */
function createMCPToolDefinition(
  serverName: string,
  mcpTool: MCPToolInfo,
  client: MCPClient,
): ToolDefinition {
  const toolName = `mcp__${serverName}__${mcpTool.name}`

  return {
    name: toolName,
    description: mcpTool.description || `MCP tool: ${mcpTool.name} from ${serverName}`,
    inputSchema: mcpTool.inputSchema || { type: 'object', properties: {} },
    isReadOnly: () => false,
    isConcurrencySafe: () => false,
    isEnabled: () => true,
    async prompt() {
      return mcpTool.description || ''
    },
    async call(input: ToolInputParams): Promise<ToolResult> {
      try {
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: input,
        })

        // Extract text content from MCP result
        let output = ''
        if (result.content) {
          for (const block of result.content) {
            if (block.type === 'text' && block.text) {
              output += block.text
            } else {
              output += JSON.stringify(block)
            }
          }
        } else {
          output = JSON.stringify(result)
        }

        return {
          type: 'tool_result',
          tool_use_id: '',
          content: output,
          is_error: result.isError || false,
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: `MCP tool error: ${message}`,
          is_error: true,
        }
      }
    },
  }
}

/**
 * Close all MCP connections.
 */
export async function closeAllConnections(connections: MCPConnection[]): Promise<void> {
  await Promise.allSettled(connections.map((c) => c.close()))
}