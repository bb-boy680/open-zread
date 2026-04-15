/**
 * Example 1: Simple Query with Streaming
 *
 * Demonstrates the basic createAgent() + query() flow with
 * real-time event streaming.
 *
 * Run: npx tsx examples/01-simple-query.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 1: Simple Query ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 10,
  })

  for await (const event of agent.query(
    'Read package.json and tell me the project name and version in one sentence.',
  )) {
    const msg = event as any

    if (msg.type === 'assistant') {
      // Print tool calls
      for (const block of msg.message?.content || []) {
        if (block.type === 'tool_use') {
          console.log(`[Tool] ${block.name}(${JSON.stringify(block.input).slice(0, 80)})`)
        }
        if (block.type === 'text') {
          console.log(`\nAssistant: ${block.text}`)
        }
      }
    }

    if (msg.type === 'result') {
      console.log(`\n--- Result: ${msg.subtype} ---`)
      console.log(`Tokens: ${msg.usage?.input_tokens} in / ${msg.usage?.output_tokens} out`)
    }
  }
}

main().catch(console.error)
