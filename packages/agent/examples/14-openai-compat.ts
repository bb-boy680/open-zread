/**
 * Example 14: OpenAI-Compatible Models
 *
 * Shows how to use the SDK with OpenAI's API or any OpenAI-compatible
 * endpoint (e.g., DeepSeek, Qwen, vLLM, Ollama).
 *
 * Environment variables:
 *   CODEANY_API_KEY=sk-...          # Your OpenAI API key
 *   CODEANY_BASE_URL=https://api.openai.com/v1   # Optional, defaults to OpenAI
 *   CODEANY_API_TYPE=openai-completions           # Optional, auto-detected from model name
 *
 * Run: npx tsx examples/14-openai-compat.ts
 */
import { createAgent } from '../src/index.js'

async function main() {
  console.log('--- Example 14: OpenAI-Compatible Models ---\n')

  // Option 1: Explicit apiType
  const agent = createAgent({
    apiType: 'openai-completions',
    model: process.env.CODEANY_MODEL || 'gpt-4o',
    apiKey: process.env.CODEANY_API_KEY,
    baseURL: process.env.CODEANY_BASE_URL || 'https://api.openai.com/v1',
    maxTurns: 5,
  })

  console.log(`API Type: ${agent.getApiType()}`)
  console.log(`Model: ${process.env.CODEANY_MODEL || 'gpt-4o'}\n`)

  // Option 2: Auto-detected from model name (uncomment to try)
  // const agent = createAgent({
  //   model: 'gpt-4o',  // Auto-detects 'openai-completions'
  //   apiKey: process.env.CODEANY_API_KEY,
  // })

  // Option 3: DeepSeek example (uncomment to try)
  // const agent = createAgent({
  //   model: 'deepseek-chat',
  //   apiKey: process.env.CODEANY_API_KEY,
  //   baseURL: 'https://api.deepseek.com/v1',
  // })

  // Option 4: Via environment variables only
  // CODEANY_API_TYPE=openai-completions
  // CODEANY_MODEL=gpt-4o
  // CODEANY_API_KEY=sk-...
  // CODEANY_BASE_URL=https://api.openai.com/v1
  // const agent = createAgent()

  for await (const event of agent.query('What is 2+2? Reply in one sentence.')) {
    const msg = event as any
    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if (block.type === 'text' && block.text.trim()) {
          console.log(`Assistant: ${block.text}`)
        }
        if (block.type === 'tool_use') {
          console.log(`[Tool: ${block.name}] ${JSON.stringify(block.input)}`)
        }
      }
    }
    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} (${msg.usage?.input_tokens}+${msg.usage?.output_tokens} tokens) ---`)
    }
  }

  await agent.close()
}

main().catch(console.error)
