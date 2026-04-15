/**
 * MCP Resource Tools
 *
 * ListMcpResources / ReadMcpResource - Access resources from MCP servers.
 */

import type { ToolDefinition, ToolResult } from '../types.js'
import type { MCPConnection } from '../mcp/client.js'

// Registry of MCP connections (set by the agent)
let mcpConnections: MCPConnection[] = []

/**
 * Set MCP connections for resource access.
 */
export function setMcpConnections(connections: MCPConnection[]): void {
  mcpConnections = connections
}

export const ListMcpResourcesTool: ToolDefinition = {
  name: 'ListMcpResources',
  description: 'List available resources from connected MCP servers. Resources can include files, databases, and other data sources.',
  inputSchema: {
    type: 'object',
    properties: {
      server: { type: 'string', description: 'Filter by MCP server name' },
    },
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'List MCP resources.' },
  async call(input: any): Promise<ToolResult> {
    const connections = input.server
      ? mcpConnections.filter(c => c.name === input.server)
      : mcpConnections

    if (connections.length === 0) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: 'No MCP servers connected.',
      }
    }

    const results: string[] = []

    for (const conn of connections) {
      if (conn.status !== 'connected') continue

      try {
        // Access the underlying client to list resources
        const resources = (conn as any)._client?.listResources?.()
        if (resources) {
          results.push(`Server: ${conn.name}`)
          for (const r of resources) {
            results.push(`  - ${r.name}: ${r.description || r.uri || ''}`)
          }
        } else {
          results.push(`Server: ${conn.name} (${conn.tools.length} tools available)`)
        }
      } catch {
        results.push(`Server: ${conn.name} (resource listing not supported)`)
      }
    }

    return {
      type: 'tool_result',
      tool_use_id: '',
      content: results.join('\n') || 'No resources found.',
    }
  },
}

export const ReadMcpResourceTool: ToolDefinition = {
  name: 'ReadMcpResource',
  description: 'Read a specific resource from an MCP server.',
  inputSchema: {
    type: 'object',
    properties: {
      server: { type: 'string', description: 'MCP server name' },
      uri: { type: 'string', description: 'Resource URI to read' },
    },
    required: ['server', 'uri'],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() { return 'Read an MCP resource.' },
  async call(input: any): Promise<ToolResult> {
    const conn = mcpConnections.find(c => c.name === input.server)
    if (!conn) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `MCP server not found: ${input.server}`,
        is_error: true,
      }
    }

    try {
      const result = await (conn as any)._client?.readResource?.({ uri: input.uri })
      if (result?.contents) {
        const texts = result.contents.map((c: any) => c.text || JSON.stringify(c)).join('\n')
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: texts,
        }
      }
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: 'Resource read returned no content.',
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `Error reading resource: ${err.message}`,
        is_error: true,
      }
    }
  },
}
