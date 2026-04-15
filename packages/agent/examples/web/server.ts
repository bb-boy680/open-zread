/**
 * Web Chat Server
 *
 * A lightweight HTTP server providing:
 *   GET  /           — serves the chat UI
 *   POST /api/chat   — SSE stream of agent events
 *   POST /api/new    — resets the session
 *
 * Run: npx tsx examples/web/server.ts
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createAgent, type Agent } from '../../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '8081')

let agent: Agent | null = null

function getOrCreateAgent(): Agent {
  if (!agent) {
    agent = createAgent({
      model: process.env.CODEANY_MODEL || 'claude-sonnet-4-6',
      maxTurns: 20,
    })
  }
  return agent
}

function resetAgent(): void {
  agent?.close().catch(() => {})
  agent = null
}

/** Read the full request body as a string. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

/** Handle POST /api/chat — SSE stream */
async function handleChat(req: IncomingMessage, res: ServerResponse) {
  const body = JSON.parse(await readBody(req))
  const prompt = body.message?.trim()
  if (!prompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'empty message' }))
    return
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const send = (event: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ event, data })}\n\n`)
  }

  const ag = getOrCreateAgent()
  const startMs = Date.now()

  try {
    for await (const ev of ag.query(prompt)) {
      switch (ev.type) {
        case 'assistant': {
          for (const block of ev.message.content) {
            if (block.type === 'text') {
              send('text', { text: block.text })
            } else if (block.type === 'tool_use') {
              send('tool_use', {
                id: block.id,
                name: block.name,
                input: block.input,
              })
            } else if ('thinking' in block) {
              send('thinking', { thinking: (block as any).thinking })
            }
          }
          break
        }
        case 'tool_result':
          send('tool_result', {
            tool_use_id: ev.result.tool_use_id,
            content: ev.result.output,
            is_error: false,
          })
          break
        case 'result':
          send('result', {
            num_turns: ev.num_turns ?? 0,
            input_tokens: ev.usage?.input_tokens ?? 0,
            output_tokens: ev.usage?.output_tokens ?? 0,
            cost: ev.total_cost_usd ?? ev.cost ?? 0,
            duration_ms: Date.now() - startMs,
          })
          break
      }
    }
  } catch (err: any) {
    send('error', { message: err.message })
  }

  send('done', null)
  res.end()
}

/** Handle POST /api/new */
function handleNewSession(_req: IncomingMessage, res: ServerResponse) {
  resetAgent()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))
}

/** Serve the static index.html */
async function serveIndex(_req: IncomingMessage, res: ServerResponse) {
  const html = await readFile(join(__dirname, 'index.html'), 'utf-8')
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

// --- HTTP Server ---

const server = createServer(async (req, res) => {
  const url = req.url || '/'
  const method = req.method || 'GET'

  try {
    if (url === '/' && method === 'GET') return await serveIndex(req, res)
    if (url === '/api/chat' && method === 'POST') return await handleChat(req, res)
    if (url === '/api/new' && method === 'POST') return handleNewSession(req, res)

    res.writeHead(404)
    res.end('Not Found')
  } catch (err: any) {
    console.error(err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
    }
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`\n  Open Agent SDK — Web Chat`)
  console.log(`  http://localhost:${PORT}\n`)
})
