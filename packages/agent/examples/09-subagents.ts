/**
 * Example 9: Subagents
 *
 * Define specialized subagents that the main agent can delegate
 * tasks to. Matches the official SDK's agents option.
 *
 * Run: npx tsx examples/09-subagents.ts
 */
import { query } from '../src/index.js'

async function main() {
  console.log('--- Example 9: Subagents ---\n')

  for await (const message of query({
    prompt: 'Use the code-reviewer agent to review src/agent.ts',
    options: {
      allowedTools: ['Read', 'Glob', 'Grep', 'Agent'],
      agents: {
        'code-reviewer': {
          description: 'Expert code reviewer for quality and security reviews.',
          prompt:
            'Analyze code quality and suggest improvements. Focus on ' +
            'security, performance, and maintainability. Be concise.',
          tools: ['Read', 'Glob', 'Grep'],
        },
      },
    },
  })) {
    const msg = message as any

    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if ('text' in block && block.text?.trim()) {
          console.log(block.text)
        }
        if ('name' in block) {
          console.log(`[${block.name}] ${JSON.stringify(block.input || {}).slice(0, 80)}`)
        }
      }
    }

    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} ---`)
    }
  }
}

main().catch(console.error)
