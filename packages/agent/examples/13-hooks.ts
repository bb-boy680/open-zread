/**
 * Example 13: Hooks
 *
 * Shows how to use lifecycle hooks to intercept agent behavior.
 * Hooks fire at key points: session start/end, before/after tool use,
 * compaction, etc.
 *
 * Run: npx tsx examples/13-hooks.ts
 */
import { createAgent, createHookRegistry } from '../src/index.js'
import type { HookInput } from '../src/index.js'

async function main() {
  console.log('--- Example 13: Hooks ---\n')

  // Create a hook registry with custom handlers
  const _registry = createHookRegistry({
    SessionStart: [{
      handler: async (input: HookInput) => {
        console.log(`[Hook] Session started: ${input.sessionId}`)
      },
    }],
    PreToolUse: [{
      handler: async (input: HookInput) => {
        console.log(`[Hook] About to use tool: ${input.toolName}`)
        // You can block a tool by returning { block: true }
        // return { block: true, message: 'Tool blocked by hook' }
      },
    }],
    PostToolUse: [{
      handler: async (input: HookInput) => {
        const output = typeof input.toolOutput === 'string'
          ? input.toolOutput.slice(0, 100)
          : JSON.stringify(input.toolOutput).slice(0, 100)
        console.log(`[Hook] Tool ${input.toolName} completed: ${output}...`)
      },
    }],
    PostToolUseFailure: [{
      handler: async (input: HookInput) => {
        console.log(`[Hook] Tool ${input.toolName} FAILED: ${input.error}`)
      },
    }],
    Stop: [{
      handler: async () => {
        console.log('[Hook] Agent loop completed')
      },
    }],
    SessionEnd: [{
      handler: async () => {
        console.log('[Hook] Session ended')
      },
    }],
  })

  // Create agent with hook registry
  // Note: For direct HookRegistry usage, we pass hooks via the engine config.
  // The AgentOptions.hooks format also works (see below).
  const agent = createAgent({
    model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
    maxTurns: 5,
    // Alternative: use AgentOptions.hooks format
    hooks: {
      PreToolUse: [{
        hooks: [async (input: any, toolUseId: string) => {
          console.log(`[AgentHook] PreToolUse: ${input.toolName} (${toolUseId})`)
        }],
      }],
    },
  })

  for await (const event of agent.query('What files are in the current directory? Be brief.')) {
    const msg = event as any
    if (msg.type === 'assistant') {
      for (const block of msg.message?.content || []) {
        if (block.type === 'text' && block.text.trim()) {
          console.log(`\nAssistant: ${block.text.slice(0, 200)}`)
        }
      }
    }
    if (msg.type === 'result') {
      console.log(`\n--- ${msg.subtype} ---`)
    }
  }

  await agent.close()
}

main().catch(console.error)
