/**
 * Example 7: Custom Tools
 *
 * Shows how to define and use custom tools alongside built-in tools.
 *
 * Run: npx tsx examples/07-custom-tools.ts
 */
import { createAgent, getAllBaseTools, defineTool } from '../src/index.js'

const weatherTool = defineTool({
  name: 'GetWeather',
  description: 'Get current weather for a city. Returns temperature and conditions.',
  inputSchema: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name (e.g., "Tokyo", "London")' },
    },
    required: ['city'],
  },
  isReadOnly: true,
  isConcurrencySafe: true,
  async call(input) {
    const temps: Record<string, number> = {
      tokyo: 22, london: 14, beijing: 25, 'new york': 18, paris: 16,
    }
    const temp = temps[input.city?.toLowerCase()] ?? 20
    return `Weather in ${input.city}: ${temp}°C, partly cloudy`
  },
})

const calculatorTool = defineTool({
  name: 'Calculator',
  description: 'Evaluate a mathematical expression. Use ** for exponentiation.',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression (e.g., "42 * 17 + 3", "2 ** 10")' },
    },
    required: ['expression'],
  },
  isReadOnly: true,
  isConcurrencySafe: true,
  async call(input) {
    try {
      const result = Function(`'use strict'; return (${input.expression})`)()
      return `${input.expression} = ${result}`
    } catch (e: any) {
      return { data: `Error: ${e.message}`, is_error: true }
    }
  },
})

async function main() {
  console.log('--- Example 7: Custom Tools ---\n')

  const builtinTools = getAllBaseTools()
  const allTools = [...builtinTools, weatherTool, calculatorTool]

  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 10,
    tools: allTools,
  })

  console.log(`Loaded ${allTools.length} tools (${builtinTools.length} built-in + 2 custom)\n`)

  for await (const event of agent.query(
    'What is the weather in Tokyo and London? Also calculate 2**10 * 3. Be brief.',
  )) {
    const msg = event as any
    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if (block.type === 'tool_use') {
          console.log(`[${block.name}] ${JSON.stringify(block.input)}`)
        }
        if (block.type === 'text' && block.text.trim()) {
          console.log(`\n${block.text}`)
        }
      }
    }
    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} ---`)
    }
  }
}

main().catch(console.error)
