import { existsSync } from 'fs';
import { mkdir, readFile, rm, unlink, writeFile } from 'fs/promises';
import path from 'path';

export interface BrowseChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  selectedText?: string;
  error?: boolean;
}

export interface BrowseChatHistorySession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  draft: string;
  selectedText: string;
  messages: BrowseChatHistoryMessage[];
}

export interface BrowseChatHistoryPayload {
  activeSessionId?: string;
  sessions: BrowseChatHistorySession[];
}

interface BrowseChatHistoryIndex {
  version: 1;
  activeSessionId?: string;
  sessions: Array<{
    id: string;
    title: string;
    file: string;
    createdAt: number;
    updatedAt: number;
  }>;
}

interface MessageMarker {
  id: string;
  role: 'user' | 'assistant';
  selectedText?: string;
  error?: boolean;
}

const HISTORY_VERSION = 1;
const MAX_HISTORY_SESSIONS = 10;
const SESSION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const MESSAGE_START_PREFIX = '<!-- open-zread-message ';
const MESSAGE_CONTENT_MARKER = '<!-- open-zread-content -->';
const MESSAGE_END_MARKER = '<!-- /open-zread-message -->';

function chatDir(projectPath: string): string {
  return path.join(projectPath, '.open-zread', 'chat');
}

function sessionsDir(projectPath: string): string {
  return path.join(chatDir(projectPath), 'sessions');
}

function indexPath(projectPath: string): string {
  return path.join(chatDir(projectPath), 'index.json');
}

function isSafeSessionId(id: string): boolean {
  return SESSION_ID_PATTERN.test(id);
}

function requireSafeSessionId(id: string): void {
  if (!isSafeSessionId(id)) {
    throw new Error(`Invalid chat session id: ${id}`);
  }
}

function sessionFile(id: string): string {
  requireSafeSessionId(id);
  return `sessions/${id}.md`;
}

function sessionPath(projectPath: string, id: string): string {
  return path.join(chatDir(projectPath), sessionFile(id));
}

function frontMatterValue(value: string | number): string {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

function parseFrontMatterValue(value: string): string | number {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === 'string' || typeof parsed === 'number'
      ? parsed
      : trimmed;
  } catch {
    return trimmed;
  }
}

function quoteMarkdown(value: string): string {
  return value
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function normalizeContentFromMarkdown(value: string): string {
  return value.replace(/^\n/, '').replace(/\n$/, '');
}

function serializeMessage(message: BrowseChatHistoryMessage): string {
  const marker: MessageMarker = {
    id: message.id,
    role: message.role,
    ...(message.selectedText ? { selectedText: message.selectedText } : {}),
    ...(message.error ? { error: true } : {}),
  };
  const heading = message.role === 'user' ? 'User' : 'Assistant';
  const lines = [
    `## ${heading}`,
    '',
    `${MESSAGE_START_PREFIX}${JSON.stringify(marker)} -->`,
    '',
  ];

  if (message.selectedText) {
    lines.push('> 引用：', quoteMarkdown(message.selectedText), '');
  }

  lines.push(
    MESSAGE_CONTENT_MARKER,
    '',
    message.content,
    '',
    MESSAGE_END_MARKER,
    '',
  );

  return lines.join('\n');
}

function serializeSession(session: BrowseChatHistorySession): string {
  return [
    '---',
    `id: ${frontMatterValue(session.id)}`,
    `title: ${frontMatterValue(session.title)}`,
    `createdAt: ${frontMatterValue(session.createdAt)}`,
    `updatedAt: ${frontMatterValue(session.updatedAt)}`,
    `draft: ${frontMatterValue(session.draft)}`,
    `selectedText: ${frontMatterValue(session.selectedText)}`,
    '---',
    '',
    `# ${session.title}`,
    '',
    ...session.messages.map(serializeMessage),
  ].join('\n');
}

function parseFrontMatter(markdown: string): {
  metadata: Record<string, string | number>;
  body: string;
} | null {
  if (!markdown.startsWith('---\n')) return null;
  const endIndex = markdown.indexOf('\n---', 4);
  if (endIndex === -1) return null;

  const raw = markdown.slice(4, endIndex);
  const metadata: Record<string, string | number> = {};
  for (const line of raw.split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (match) {
      metadata[match[1]] = parseFrontMatterValue(match[2]);
    }
  }

  return {
    metadata,
    body: markdown.slice(endIndex + '\n---'.length),
  };
}

function isMessageMarker(value: unknown): value is MessageMarker {
  if (!value || typeof value !== 'object') return false;
  const marker = value as Record<string, unknown>;
  return (
    typeof marker.id === 'string' &&
    (marker.role === 'user' || marker.role === 'assistant') &&
    (marker.selectedText === undefined || typeof marker.selectedText === 'string') &&
    (marker.error === undefined || typeof marker.error === 'boolean')
  );
}

function parseMessages(body: string): BrowseChatHistoryMessage[] {
  const messages: BrowseChatHistoryMessage[] = [];
  const pattern =
    /<!-- open-zread-message ([^\n]+) -->[\s\S]*?<!-- open-zread-content -->\n?([\s\S]*?)\n?<!-- \/open-zread-message -->/g;
  for (const match of body.matchAll(pattern)) {
    try {
      const marker = JSON.parse(match[1]) as unknown;
      if (!isMessageMarker(marker)) continue;
      messages.push({
        id: marker.id,
        role: marker.role,
        content: normalizeContentFromMarkdown(match[2]),
        ...(marker.selectedText ? { selectedText: marker.selectedText } : {}),
        ...(marker.error ? { error: true } : {}),
      });
    } catch {
      continue;
    }
  }
  return messages;
}

function parseSession(markdown: string): BrowseChatHistorySession | null {
  const parsed = parseFrontMatter(markdown);
  if (!parsed) return null;
  const { metadata, body } = parsed;

  if (
    typeof metadata.id !== 'string' ||
    typeof metadata.title !== 'string' ||
    typeof metadata.createdAt !== 'number' ||
    typeof metadata.updatedAt !== 'number'
  ) {
    return null;
  }
  if (!isSafeSessionId(metadata.id)) return null;

  return {
    id: metadata.id,
    title: metadata.title,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    draft: typeof metadata.draft === 'string' ? metadata.draft : '',
    selectedText:
      typeof metadata.selectedText === 'string' ? metadata.selectedText : '',
    messages: parseMessages(body),
  };
}

function normalizeSession(
  session: BrowseChatHistorySession,
): BrowseChatHistorySession | null {
  if (!isSafeSessionId(session.id)) return null;
  return {
    id: session.id,
    title: session.title || '新聊天',
    createdAt: Number.isFinite(session.createdAt) ? session.createdAt : Date.now(),
    updatedAt: Number.isFinite(session.updatedAt) ? session.updatedAt : Date.now(),
    draft: session.draft ?? '',
    selectedText: session.selectedText ?? '',
    messages: session.messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        ...(message.selectedText ? { selectedText: message.selectedText } : {}),
        ...(message.error ? { error: true } : {}),
      })),
  };
}

async function readIndex(projectPath: string): Promise<BrowseChatHistoryIndex> {
  if (!existsSync(indexPath(projectPath))) {
    return { version: HISTORY_VERSION, sessions: [] };
  }

  try {
    const raw = await readFile(indexPath(projectPath), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BrowseChatHistoryIndex>;
    if (parsed.version !== HISTORY_VERSION || !Array.isArray(parsed.sessions)) {
      return { version: HISTORY_VERSION, sessions: [] };
    }

    return {
      version: HISTORY_VERSION,
      activeSessionId:
        typeof parsed.activeSessionId === 'string'
          ? parsed.activeSessionId
          : undefined,
      sessions: parsed.sessions.filter(
        (session) =>
          session &&
          typeof session.id === 'string' &&
          isSafeSessionId(session.id) &&
          typeof session.file === 'string',
      ),
    };
  } catch {
    return { version: HISTORY_VERSION, sessions: [] };
  }
}

async function writeIndex(
  projectPath: string,
  payload: BrowseChatHistoryPayload,
): Promise<void> {
  const ids = new Set(payload.sessions.map((session) => session.id));
  const activeSessionId =
    payload.activeSessionId && ids.has(payload.activeSessionId)
      ? payload.activeSessionId
      : payload.sessions[0]?.id;
  const index: BrowseChatHistoryIndex = {
    version: HISTORY_VERSION,
    ...(activeSessionId ? { activeSessionId } : {}),
    sessions: payload.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      file: sessionFile(session.id),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
  };

  await mkdir(chatDir(projectPath), { recursive: true });
  await writeFile(indexPath(projectPath), `${JSON.stringify(index, null, 2)}\n`);
}

export async function loadBrowseChatHistory(
  projectPath: string,
): Promise<BrowseChatHistoryPayload> {
  const index = await readIndex(projectPath);
  const sessions: BrowseChatHistorySession[] = [];

  for (const indexedSession of index.sessions) {
    try {
      const markdown = await readFile(
        sessionPath(projectPath, indexedSession.id),
        'utf-8',
      );
      const session = parseSession(markdown);
      if (session) sessions.push(session);
    } catch {
      continue;
    }
  }

  const activeSessionId = sessions.some(
    (session) => session.id === index.activeSessionId,
  )
    ? index.activeSessionId
    : sessions[0]?.id;

  return {
    ...(activeSessionId ? { activeSessionId } : {}),
    sessions,
  };
}

export async function saveBrowseChatHistory(
  projectPath: string,
  payload: BrowseChatHistoryPayload,
): Promise<BrowseChatHistoryPayload> {
  const previousIndex = await readIndex(projectPath);
  const sessions = payload.sessions
    .map(normalizeSession)
    .filter((session): session is BrowseChatHistorySession => Boolean(session))
    .slice(0, MAX_HISTORY_SESSIONS);
  const nextIds = new Set(sessions.map((session) => session.id));

  await mkdir(sessionsDir(projectPath), { recursive: true });

  for (const previousSession of previousIndex.sessions) {
    if (!nextIds.has(previousSession.id)) {
      await rm(sessionPath(projectPath, previousSession.id), {
        force: true,
      });
    }
  }

  for (const session of sessions) {
    await writeFile(sessionPath(projectPath, session.id), serializeSession(session));
  }

  await writeIndex(projectPath, {
    activeSessionId: payload.activeSessionId,
    sessions,
  });

  return loadBrowseChatHistory(projectPath);
}

export async function deleteBrowseChatSession(
  projectPath: string,
  sessionId: string,
): Promise<BrowseChatHistoryPayload> {
  requireSafeSessionId(sessionId);
  const index = await readIndex(projectPath);
  const remainingSessions = index.sessions.filter(
    (session) => session.id !== sessionId,
  );

  await unlink(sessionPath(projectPath, sessionId)).catch(() => undefined);
  await writeIndex(projectPath, {
    activeSessionId:
      index.activeSessionId === sessionId
        ? remainingSessions[0]?.id
        : index.activeSessionId,
    sessions: remainingSessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      draft: '',
      selectedText: '',
      messages: [],
    })),
  });

  return loadBrowseChatHistory(projectPath);
}
