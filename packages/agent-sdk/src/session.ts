/**
 * Session Storage & Management
 *
 * Persists conversation transcripts to disk for resumption.
 * Manages session lifecycle (create, resume, list, fork).
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'
import type { NormalizedMessageParam } from './providers/types.js'

/**
 * Session metadata.
 */
export interface SessionMetadata {
  id: string
  cwd: string
  model: string
  createdAt: string
  updatedAt: string
  messageCount: number
  summary?: string
  tag?: string | null
}

/**
 * Session data on disk.
 */
export interface SessionData {
  metadata: SessionMetadata
  messages: NormalizedMessageParam[]
}

/**
 * Get the sessions directory path.
 */
function getSessionsDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp'
  return join(home, '.open-agent-sdk', 'sessions')
}

/**
 * Get the path for a specific session.
 */
function getSessionPath(sessionId: string): string {
  return join(getSessionsDir(), sessionId)
}

/**
 * Save session to disk.
 */
export async function saveSession(
  sessionId: string,
  messages: NormalizedMessageParam[],
  metadata: Partial<SessionMetadata>,
): Promise<void> {
  const dir = getSessionPath(sessionId)
  await mkdir(dir, { recursive: true })

  const data: SessionData = {
    metadata: {
      id: sessionId,
      cwd: metadata.cwd || process.cwd(),
      model: metadata.model || 'claude-sonnet-4-6',
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: messages.length,
      summary: metadata.summary,
    },
    messages,
  }

  await writeFile(
    join(dir, 'transcript.json'),
    JSON.stringify(data, null, 2),
    'utf-8',
  )
}

/**
 * Load session from disk.
 */
export async function loadSession(sessionId: string): Promise<SessionData | null> {
  try {
    const filePath = join(getSessionPath(sessionId), 'transcript.json')
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as SessionData
  } catch {
    return null
  }
}

/**
 * List all sessions.
 */
export async function listSessions(): Promise<SessionMetadata[]> {
  try {
    const dir = getSessionsDir()
    const entries = await readdir(dir)
    const sessions: SessionMetadata[] = []

    for (const entry of entries) {
      try {
        const data = await loadSession(entry)
        if (data?.metadata) {
          sessions.push(data.metadata)
        }
      } catch {
        // Skip invalid sessions
      }
    }

    // Sort by updatedAt descending
    sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return sessions
  } catch {
    return []
  }
}

/**
 * Fork a session (create a copy with a new ID).
 */
export async function forkSession(
  sourceSessionId: string,
  newSessionId?: string,
): Promise<string | null> {
  const data = await loadSession(sourceSessionId)
  if (!data) return null

  const forkId = newSessionId || crypto.randomUUID()

  await saveSession(forkId, data.messages, {
    ...data.metadata,
    id: forkId,
    createdAt: new Date().toISOString(),
    summary: `Forked from session ${sourceSessionId}`,
  })

  return forkId
}

/**
 * Get session messages.
 */
export async function getSessionMessages(
  sessionId: string,
): Promise<NormalizedMessageParam[]> {
  const data = await loadSession(sessionId)
  return data?.messages || []
}

/**
 * Append a message to a session transcript.
 */
export async function appendToSession(
  sessionId: string,
  message: NormalizedMessageParam,
): Promise<void> {
  const data = await loadSession(sessionId)
  if (!data) return

  data.messages.push(message)
  data.metadata.updatedAt = new Date().toISOString()
  data.metadata.messageCount = data.messages.length

  await saveSession(sessionId, data.messages, data.metadata)
}

/**
 * Delete a session.
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const { rm } = await import('fs/promises')
    await rm(getSessionPath(sessionId), { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

/**
 * Get info about a specific session.
 */
export async function getSessionInfo(
  sessionId: string,
  _options?: { dir?: string },
): Promise<SessionMetadata | null> {
  const data = await loadSession(sessionId)
  return data?.metadata || null
}

/**
 * Rename a session.
 */
export async function renameSession(
  sessionId: string,
  title: string,
  _options?: { dir?: string },
): Promise<void> {
  const data = await loadSession(sessionId)
  if (!data) return

  data.metadata.summary = title
  data.metadata.updatedAt = new Date().toISOString()

  await saveSession(sessionId, data.messages, data.metadata)
}

/**
 * Tag a session.
 */
export async function tagSession(
  sessionId: string,
  tag: string | null,
  _options?: { dir?: string },
): Promise<void> {
  const data = await loadSession(sessionId)
  if (!data) return

  data.metadata.tag = tag
  data.metadata.updatedAt = new Date().toISOString()

  await saveSession(sessionId, data.messages, data.metadata)
}
