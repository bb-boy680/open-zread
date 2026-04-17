/**
 * Example 5: Custom System Prompt
 *
 * Shows how to customize the agent's behavior with a system prompt.
 *
 * Run: npx tsx examples/05-custom-system-prompt.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 5: Custom System Prompt ---\n')

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 5,
    systemPrompt:
      'You are a senior code reviewer. When asked to review code, focus on: ' +
      '1) Security issues, 2) Performance concerns, 3) Maintainability. ' +
      'Be concise and use bullet points.',
  })

  const result = await agent.prompt('Read src/agent.ts and give a brief code review.')
  console.log(result.text)
}

main().catch(console.error)
