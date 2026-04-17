/**
 * Example 11: Custom Tools with tool() + createSdkMcpServer()
 *
 * Shows the Zod-based tool() helper and in-process MCP server creation.
 * This is the recommended way to add custom tools.
 *
 * Run: npx tsx examples/11-custom-mcp-tools.ts
 */
import { z } from 'zod'
import { query, tool, createSdkMcpServer } from '../src/index.js'

// Define tools using Zod schemas for type-safe input validation
const getTemperature = tool(
  'get_temperature',
  'Get the current temperature at a location',
  {
    city: z.string().describe('City name'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius').describe('Temperature unit'),
  },
  async ({ city, unit }) => {
    // Mock weather data
    const temps: Record<string, number> = {
      tokyo: 22, london: 14, paris: 16, 'new york': 18, beijing: 25,
    }
    const tempC = temps[city.toLowerCase()] ?? 20
    const temp = unit === 'fahrenheit' ? tempC * 9 / 5 + 32 : tempC
    const symbol = unit === 'fahrenheit' ? '°F' : '°C'

    return {
      content: [{ type: 'text' as const, text: `Temperature in ${city}: ${temp}${symbol}` }],
    }
  },
  { annotations: { readOnlyHint: true } },
)

const convertUnits = tool(
  'convert_units',
  'Convert between measurement units',
  {
    value: z.number().describe('Value to convert'),
    from_unit: z.string().describe('Source unit'),
    to_unit: z.string().describe('Target unit'),
  },
  async ({ value, from_unit, to_unit }) => {
    const conversions: Record<string, Record<string, (v: number) => number>> = {
      km: { miles: (v) => v * 0.621371, m: (v) => v * 1000 },
      miles: { km: (v) => v * 1.60934, m: (v) => v * 1609.34 },
      kg: { lbs: (v) => v * 2.20462, g: (v) => v * 1000 },
      lbs: { kg: (v) => v * 0.453592, g: (v) => v * 453.592 },
    }

    const fn = conversions[from_unit]?.[to_unit]
    if (!fn) {
      return {
        content: [{ type: 'text' as const, text: `Cannot convert from ${from_unit} to ${to_unit}` }],
        isError: true,
      }
    }

    const result = fn(value)
    return {
      content: [{ type: 'text' as const, text: `${value} ${from_unit} = ${result.toFixed(2)} ${to_unit}` }],
    }
  },
)

// Bundle tools into an in-process MCP server
const utilityServer = createSdkMcpServer({
  name: 'utilities',
  version: '1.0.0',
  tools: [getTemperature, convertUnits],
})

async function main() {
  console.log('--- Example 11: Custom MCP Tools (tool + createSdkMcpServer) ---\n')

  for await (const message of query({
    prompt: 'What is the temperature in Tokyo and Paris? Also convert 10 km to miles. Be brief.',
    options: {
      mcpServers: { utilities: utilityServer as any },
      allowedTools: ['mcp__utilities__*'],
      permissionMode: 'bypassPermissions',
    },
  })) {
    const msg = message as any

    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block && block.text?.trim()) {
          console.log(block.text)
        } else if ('name' in block) {
          console.log(`[${block.name}] ${JSON.stringify(block.input || {})}`)
        }
      }
    } else if (msg.type === 'result') {
      console.log(`\nDone: ${msg.subtype} (cost: $${msg.total_cost_usd?.toFixed(4) || '0'})`)
    }
  }
}

main().catch(console.error)
