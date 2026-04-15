/**
 * Example 8: Official SDK-Compatible API
 *
 * Demonstrates the query() function with the same API pattern
 * as open-agent-sdk. Drop-in compatible.
 *
 * Run: npx tsx examples/08-official-api-compat.ts
 */
import { query } from '../src/index.js'

async function main() {
  console.log('--- Example 8: Official SDK-Compatible API ---\n')

  // Standard SDK query pattern
  for await (const message of query({
    prompt: 'What files are in this directory? Be brief.',
    options: {
      allowedTools: ['Bash', 'Glob'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    const msg = message as any

    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block && block.text) {
          console.log(block.text)
        } else if ('name' in block) {
          console.log(`Tool: ${block.name}`)
        }
      }
    } else if (msg.type === 'result') {
      console.log(`\nDone: ${msg.subtype}`)
    }
  }
}

main().catch(console.error)
