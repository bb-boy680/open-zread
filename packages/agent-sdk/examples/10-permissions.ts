/**
 * Example 10: Permissions and Allowed Tools
 *
 * Shows how to restrict which tools the agent can use.
 * Creates a read-only agent that can analyze but not modify code.
 *
 * Run: npx tsx examples/10-permissions.ts
 */
import { query } from '../src/index.js'

async function main() {
  console.log('--- Example 10: Read-Only Agent ---\n')

  // Read-only agent: can only use Read, Glob, Grep
  for await (const message of query({
    prompt: 'Review the code in src/agent.ts for best practices. Be concise.',
    options: {
      allowedTools: ['Read', 'Glob', 'Grep'],
    },
  })) {
    const msg = message as any

    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if ('text' in block && block.text?.trim()) {
          console.log(block.text)
        }
        if ('name' in block) {
          console.log(`[${block.name}]`)
        }
      }
    }

    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} ---`)
    }
  }
}

main().catch(console.error)
