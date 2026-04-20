/**
 * Agent - High-level API
 *
 * Provides createAgent() and query() interfaces compatible with
 * open-agent-sdk.
 *
 * Usage:
 *   import { createAgent } from 'open-agent-sdk'
 *   const agent = createAgent({ model: 'claude-sonnet-4-6' })
 *   for await (const event of agent.query('Hello')) { ... }
 *
 *   // OpenAI-compatible models
 *   const agent = createAgent({
 *     apiType: 'openai-completions',
 *     model: 'gpt-4o',
 *     apiKey: 'sk-...',
 *     baseURL: 'https://api.openai.com/v1',
 *   })
 */

import type {
  AgentOptions,
  QueryResult,
  SDKMessage,
  ToolDefinition,
  CanUseToolFn,
  Message,
  PermissionMode,
  ContentBlock,
} from './types.js'
import { QueryEngine } from './engine.js'
import { getAllBaseTools, filterTools } from './tools/index.js'
import { connectMCPServer, type MCPConnection } from './mcp/client.js'
import { isSdkServerConfig } from './sdk-mcp-server.js'
import { registerAgents } from './tools/agent-tool.js'
import {
  saveSession,
  loadSession,
} from './session.js'
import { createHookRegistry, type HookRegistry, type HookEvent, HOOK_EVENTS } from './hooks.js'
import { initBundledSkills } from './skills/index.js'
import { createProvider, type LLMProvider, type ApiType } from './providers/index.js'
import type { NormalizedMessageParam } from './providers/types.js'

// --------------------------------------------------------------------------
// Agent class
// --------------------------------------------------------------------------

export class Agent {
  private cfg: AgentOptions
  private toolPool: ToolDefinition[]
  private modelId: string
  private providerId: string
  private apiCredentials: { key?: string; baseUrl?: string }
  private provider: LLMProvider
  private mcpLinks: MCPConnection[] = []
  private history: NormalizedMessageParam[] = []
  private messageLog: Message[] = []
  private setupDone: Promise<void>
  private sid: string
  private abortCtrl: AbortController | null = null
  private currentEngine: QueryEngine | null = null
  private hookRegistry: HookRegistry

  constructor(options: AgentOptions = {}) {
    // Shallow copy to avoid mutating caller's object
    this.cfg = { ...options }

    // Merge credentials from options.env map, direct options, and process.env
    this.apiCredentials = this.pickCredentials()
    this.modelId = this.cfg.model ?? this.readEnv('CODEANY_MODEL') ?? 'claude-sonnet-4-6'
    this.sid = this.cfg.sessionId ?? crypto.randomUUID()

    // Resolve provider ID
    this.providerId = this.cfg.providerId ?? this.extractProviderId()

    // Create LLM provider
    this.provider = createProvider(this.providerId, {
      apiKey: this.apiCredentials.key ?? '',
      baseURL: this.apiCredentials.baseUrl,
    })

    // Initialize bundled skills
    initBundledSkills()

    // Build hook registry from options
    this.hookRegistry = createHookRegistry()
    if (this.cfg.hooks) {
      // Convert AgentOptions hooks format to HookConfig
      for (const [event, defs] of Object.entries(this.cfg.hooks)) {
        // Validate event is a known HookEvent
        if (!HOOK_EVENTS.includes(event as HookEvent)) continue
        const hookEvent = event as HookEvent
        for (const def of defs) {
          for (const handler of def.hooks) {
            this.hookRegistry.register(hookEvent, {
              matcher: def.matcher,
              timeout: def.timeout,
              handler: async (input) => {
                const result = await handler(input, input.toolUseId || '', {
                  signal: this.abortCtrl?.signal || new AbortController().signal,
                })
                return result || undefined
              },
            })
          }
        }
      }
    }

    // Build tool pool from options (supports ToolDefinition[], string[], or preset)
    this.toolPool = this.buildToolPool()

    // Kick off async setup (MCP connections, agent registration, session resume)
    this.setupDone = this.setup()
  }

  /**
   * Extract provider ID from model name or apiType (for backwards compatibility).
   */
  private extractProviderId(): string {
    // Explicit providerId option
    if (this.cfg.providerId) return this.cfg.providerId

    // From model string (e.g., "anthropic/claude-sonnet-4-6")
    if (this.modelId.includes('/')) {
      return this.modelId.split('/')[0]
    }

    // Infer from model name (priority over apiType for custom providers)
    const modelLower = this.modelId.toLowerCase()
    if (modelLower.includes('claude')) return 'anthropic'
    if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('o3')) return 'openai'
    if (modelLower.includes('deepseek')) return 'deepseek'
    if (modelLower.includes('glm')) return 'zhipu'
    if (modelLower.includes('qwen')) return 'qwen'
    if (modelLower.includes('moonshot')) return 'moonshot'

    // Backwards compatibility: infer from apiType (fallback when model name doesn't match)
    if (this.cfg.apiType === 'openai-completions') {
      // Use 'openai-compatible' instead of 'openai' to respect user's baseURL
      return 'openai-compatible'
    }

    // Default
    return 'anthropic'
  }

  /** Pick API key and base URL from options or CODEANY_* env vars. */
  private pickCredentials(): { key?: string; baseUrl?: string } {
    const envMap = this.cfg.env
    return {
      key:
        this.cfg.apiKey ??
        envMap?.CODEANY_API_KEY ??
        envMap?.CODEANY_AUTH_TOKEN ??
        this.readEnv('CODEANY_API_KEY') ??
        this.readEnv('CODEANY_AUTH_TOKEN'),
      baseUrl:
        this.cfg.baseURL ??
        envMap?.CODEANY_BASE_URL ??
        this.readEnv('CODEANY_BASE_URL'),
    }
  }

  /** Read a value from process.env (returns undefined if missing). */
  private readEnv(key: string): string | undefined {
    return process.env[key] || undefined
  }

  /** Assemble the available tool set based on options. */
  private buildToolPool(): ToolDefinition[] {
    const raw = this.cfg.tools
    let pool: ToolDefinition[]

    if (!raw || (typeof raw === 'object' && !Array.isArray(raw) && 'type' in raw)) {
      pool = getAllBaseTools()
    } else if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
      pool = filterTools(getAllBaseTools(), raw as string[])
    } else {
      pool = raw as ToolDefinition[]
    }

    return filterTools(pool, this.cfg.allowedTools, this.cfg.disallowedTools)
  }

  /**
   * Async initialization: connect MCP servers, register agents, resume sessions.
   */
  private async setup(): Promise<void> {
    // Register custom agent definitions
    if (this.cfg.agents) {
      registerAgents(this.cfg.agents)
    }

    // Connect MCP servers (supports stdio, SSE, HTTP, and in-process SDK servers)
    if (this.cfg.mcpServers) {
      for (const [name, config] of Object.entries(this.cfg.mcpServers)) {
        try {
          if (isSdkServerConfig(config)) {
            // In-process SDK MCP server - directly add tools
            this.toolPool = [...this.toolPool, ...config.tools]
          } else {
            // External MCP server
            const connection = await connectMCPServer(name, config)
            this.mcpLinks.push(connection)

            if (connection.status === 'connected' && connection.tools.length > 0) {
              this.toolPool = [...this.toolPool, ...connection.tools]
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`[MCP] Failed to connect to "${name}": ${message}`)
        }
      }
    }

    // Resume or continue session
    if (this.cfg.resume) {
      const sessionData = await loadSession(this.cfg.resume)
      if (sessionData) {
        this.history = sessionData.messages
        this.sid = this.cfg.resume
      }
    }
  }

  /**
   * Run a query with streaming events.
   */
  async *query(
    prompt: string,
    overrides?: Partial<AgentOptions>,
  ): AsyncGenerator<SDKMessage, void> {
    await this.setupDone

    const opts = { ...this.cfg, ...overrides }
    const cwd = opts.cwd || process.cwd()

    // Create abort controller for this query
    this.abortCtrl = opts.abortController || new AbortController()
    if (opts.abortSignal) {
      opts.abortSignal.addEventListener('abort', () => this.abortCtrl?.abort(), { once: true })
    }

    // Resolve systemPrompt (handle preset object)
    let systemPrompt: string | undefined
    let appendSystemPrompt = opts.appendSystemPrompt
    if (typeof opts.systemPrompt === 'object' && opts.systemPrompt?.type === 'preset') {
      systemPrompt = undefined // Use engine default (default style)
      if (opts.systemPrompt.append) {
        appendSystemPrompt = (appendSystemPrompt || '') + '\n' + opts.systemPrompt.append
      }
    } else {
      systemPrompt = opts.systemPrompt as string | undefined
    }

    // Build canUseTool based on permission mode
    const permMode = opts.permissionMode ?? 'bypassPermissions'
    const canUseTool: CanUseToolFn = opts.canUseTool ?? (async (_tool, _input) => {
      if (permMode === 'bypassPermissions' || permMode === 'dontAsk' || permMode === 'auto') {
        return { behavior: 'allow' }
      }
      if (permMode === 'acceptEdits') {
        return { behavior: 'allow' }
      }
      return { behavior: 'allow' }
    })

    // Resolve tools with overrides
    let tools = this.toolPool
    if (overrides?.allowedTools || overrides?.disallowedTools) {
      tools = filterTools(tools, overrides.allowedTools, overrides.disallowedTools)
    }
    if (overrides?.tools) {
      const ot = overrides.tools
      if (Array.isArray(ot) && ot.length > 0 && typeof ot[0] === 'string') {
        tools = filterTools(this.toolPool, ot as string[])
      } else if (Array.isArray(ot)) {
        tools = ot as ToolDefinition[]
      }
    }

    // Recreate provider if overrides change credentials or providerId
    let provider = this.provider
    if (overrides?.providerId || overrides?.apiKey || overrides?.baseURL) {
      const resolvedProviderId = overrides.providerId ?? this.providerId
      provider = createProvider(resolvedProviderId, {
        apiKey: overrides.apiKey ?? this.apiCredentials.key ?? '',
        baseURL: overrides.baseURL ?? this.apiCredentials.baseUrl,
      })
    }

    // Create query engine with current conversation state
    const engine = new QueryEngine({
      cwd,
      model: opts.model || this.modelId,
      provider,
      tools,
      systemPrompt,
      appendSystemPrompt,
      maxTurns: opts.maxTurns ?? 10,
      maxBudgetUsd: opts.maxBudgetUsd,
      maxTokens: opts.maxTokens ?? 16384,
      thinking: opts.thinking,
      jsonSchema: opts.jsonSchema,
      canUseTool,
      includePartialMessages: opts.includePartialMessages ?? false,
      abortSignal: this.abortCtrl.signal,
      agents: opts.agents,
      hookRegistry: this.hookRegistry,
      sessionId: this.sid,
    })
    this.currentEngine = engine

    // Inject existing conversation history
    for (const msg of this.history) {
      engine.messages.push(msg)
    }

    // Run the engine
    for await (const event of engine.submitMessage(prompt)) {
      yield event

      // Track assistant messages for multi-turn persistence
      if (event.type === 'assistant') {
        const uuid = crypto.randomUUID()
        const timestamp = new Date().toISOString()
        this.messageLog.push({
          type: 'assistant',
          message: event.message,
          uuid,
          timestamp,
        })
      }
    }

    // Persist conversation state for multi-turn
    this.history = engine.getMessages()

    // Add user message to tracked messages
    const userUuid = crypto.randomUUID()
    this.messageLog.push({
      type: 'user',
      message: { role: 'user', content: prompt },
      uuid: userUuid,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Convenience method: send a prompt and collect the final answer as a single object.
   * Internally iterates through the streaming query and aggregates the outcome.
   */
  async prompt(
    text: string,
    overrides?: Partial<AgentOptions>,
  ): Promise<QueryResult> {
    const t0 = performance.now()
    const collected = { text: '', turns: 0, tokens: { in: 0, out: 0 } }

    for await (const ev of this.query(text, overrides)) {
      switch (ev.type) {
        case 'assistant': {
          // Extract the last assistant text (multi-turn: only final answer matters)
          const fragments = ev.message.content
            .filter((c: ContentBlock) => c.type === 'text')
            .map((c: ContentBlock) => (c as { type: 'text'; text: string }).text)
          if (fragments.length) collected.text = fragments.join('')
          break
        }
        case 'result':
          collected.turns = ev.num_turns ?? 0
          collected.tokens.in = ev.usage?.input_tokens ?? 0
          collected.tokens.out = ev.usage?.output_tokens ?? 0
          break
      }
    }

    return {
      text: collected.text,
      usage: { input_tokens: collected.tokens.in, output_tokens: collected.tokens.out },
      num_turns: collected.turns,
      duration_ms: Math.round(performance.now() - t0),
      messages: [...this.messageLog],
    }
  }

  /**
   * Get conversation messages.
   */
  getMessages(): Message[] {
    return [...this.messageLog]
  }

  /**
   * Reset conversation history.
   */
  clear(): void {
    this.history = []
    this.messageLog = []
  }

  /**
   * Interrupt the current query.
   */
  async interrupt(): Promise<void> {
    this.abortCtrl?.abort()
  }

  /**
   * Change the model during a session.
   */
  async setModel(model?: string): Promise<void> {
    if (model) {
      this.modelId = model
      this.cfg.model = model
    }
  }

  /**
   * Change the permission mode during a session.
   */
  async setPermissionMode(mode: PermissionMode): Promise<void> {
    this.cfg.permissionMode = mode
  }

  /**
   * Set maximum thinking tokens.
   */
  async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void> {
    if (maxThinkingTokens === null) {
      this.cfg.thinking = { type: 'disabled' }
    } else {
      this.cfg.thinking = { type: 'enabled', budgetTokens: maxThinkingTokens }
    }
  }

  /**
   * Get the session ID.
   */
  getSessionId(): string {
    return this.sid
  }

  /**
   * Get the current provider ID.
   */
  getProviderId(): string {
    return this.providerId
  }

  /**
   * Get the current API type (for backwards compatibility).
   * @deprecated Use getProviderId() instead
   */
  getApiType(): ApiType {
    // Map providerId to apiType for backwards compatibility
    if (this.providerId === 'anthropic') return 'anthropic-messages'
    return 'openai-completions'
  }

  /**
   * Stop a background task.
   */
  async stopTask(taskId: string): Promise<void> {
    const { getTask } = await import('./tools/task-tools.js')
    const task = getTask(taskId)
    if (task) {
      task.status = 'cancelled'
    }
  }

  /**
   * Close MCP connections and clean up.
   * Optionally persist session to disk.
   */
  async close(): Promise<void> {
    // Persist session if enabled
    if (this.cfg.persistSession !== false && this.history.length > 0) {
      try {
        await saveSession(this.sid, this.history, {
          cwd: this.cfg.cwd || process.cwd(),
          model: this.modelId,
          summary: undefined,
        })
      } catch {
        // Session persistence is best-effort
      }
    }

    for (const conn of this.mcpLinks) {
      await conn.close()
    }
    this.mcpLinks = []
  }
}

// --------------------------------------------------------------------------
// Factory function
// --------------------------------------------------------------------------

/** Factory: shorthand for `new Agent(options)`. */
export function createAgent(options: AgentOptions = {}): Agent {
  return new Agent(options)
}

// --------------------------------------------------------------------------
// Standalone query — one-shot convenience wrapper
// --------------------------------------------------------------------------

/**
 * Execute a single agentic query without managing an Agent instance.
 * The agent is created, used, and cleaned up automatically.
 */
export async function* query(params: {
  prompt: string
  options?: AgentOptions
}): AsyncGenerator<SDKMessage, void> {
  const ephemeral = createAgent(params.options)
  try {
    yield* ephemeral.query(params.prompt)
  } finally {
    await ephemeral.close()
  }
}
