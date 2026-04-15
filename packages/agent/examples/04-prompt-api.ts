/**
 * Example 4: Simple Prompt API
 *
 * Uses the blocking prompt() method for quick one-shot queries.
 * No need to iterate over streaming events.
 *
 * Run: npx tsx examples/04-prompt-api.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 4: Simple Prompt API ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 5,
  })

  const result = await agent.prompt(
    'Use Bash to run `node --version` and `npm --version`, then tell me the versions.',
  )

  console.log(`Answer: ${result.text}`)
  console.log(`Turns: ${result.num_turns}`)
  console.log(`Tokens: ${result.usage.input_tokens} in / ${result.usage.output_tokens} out`)
  console.log(`Duration: ${result.duration_ms}ms`)
}

main().catch(console.error)
