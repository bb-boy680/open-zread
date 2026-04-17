/**
 * Example 2: Multi-Tool Orchestration
 *
 * The agent autonomously uses Glob, Bash, and Read tools to
 * accomplish a multi-step task.
 *
 * Run: npx tsx examples/02-multi-tool.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 2: Multi-Tool Orchestration ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 15,
  })

  for await (const event of agent.query(
    'Do these steps: ' +
    '1) Use Glob to find all .ts files in src/ (pattern "src/*.ts"). ' +
    '2) Use Bash to count lines in src/agent.ts with `wc -l`. ' +
    '3) Give a brief summary.',
  )) {
    const msg = event as any

    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if (block.type === 'tool_use') {
          console.log(`[${block.name}] ${JSON.stringify(block.input).slice(0, 100)}`)
        }
        if (block.type === 'text' && block.text.trim()) {
          console.log(`\n${block.text}`)
        }
      }
    }

    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} | ${msg.usage?.input_tokens}/${msg.usage?.output_tokens} tokens ---`)
    }
  }
}

main().catch(console.error)
