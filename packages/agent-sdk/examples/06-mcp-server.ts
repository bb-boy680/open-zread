/**
 * Example 6: MCP Server Integration
 *
 * Connects to an MCP (Model Context Protocol) server and uses
 * its tools through the agent. This example uses the filesystem
 * MCP server as a demonstration.
 *
 * Prerequisites:
 *   npm install -g @modelcontextprotocol/server-filesystem
 *
 * Run: npx tsx examples/06-mcp-server.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 6: MCP Server Integration ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 10,
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      },
    },
  })

  console.log('Connecting to MCP filesystem server...\n')

  const result = await agent.prompt(
    'Use the filesystem MCP tools to list files in /tmp. Be brief.',
  )

  console.log(`Answer: ${result.text}`)
  console.log(`Turns: ${result.num_turns}`)

  await agent.close()
}

main().catch(e => {
  console.error('Error:', e.message)
  if (e.message.includes('ENOENT') || e.message.includes('not found')) {
    console.error(
      '\nMCP server not found. Install it with:\n' +
      '  npm install -g @modelcontextprotocol/server-filesystem\n',
    )
  }
})
