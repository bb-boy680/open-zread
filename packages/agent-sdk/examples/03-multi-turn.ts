/**
 * Example 3: Multi-Turn Conversation
 *
 * Demonstrates session persistence across multiple turns.
 * The agent remembers context from previous interactions.
 *
 * Run: npx tsx examples/03-multi-turn.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 3: Multi-Turn Conversation ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 5,
  })

  // Turn 1: Create a file
  console.log('> Turn 1: Create a file')
  const r1 = await agent.prompt(
    'Use Bash to run: echo "Hello Open Agent SDK" > /tmp/oas-test.txt. Confirm briefly.',
  )
  console.log(`  ${r1.text}\n`)

  // Turn 2: Read back (should remember context)
  console.log('> Turn 2: Read the file back')
  const r2 = await agent.prompt('Read the file you just created and tell me its contents.')
  console.log(`  ${r2.text}\n`)

  // Turn 3: Clean up
  console.log('> Turn 3: Cleanup')
  const r3 = await agent.prompt('Delete that file with Bash. Confirm.')
  console.log(`  ${r3.text}\n`)

  console.log(`Session history: ${agent.getMessages().length} messages`)
}

main().catch(console.error)
