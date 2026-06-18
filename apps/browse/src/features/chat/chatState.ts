import type {
  ChatHistoryPayload,
  ChatRequest,
  ChatRequestContext,
  ChatSession,
  ChatSessionStatus,
  ChatState,
} from './types';

export const MAX_CHAT_SESSIONS = 10;
export const SELECTED_TEXT_LIMIT = 4000;
export const SELECTED_TEXT_SUMMARY_LIMIT = 96;
export const PAGE_CONTENT_LIMIT = 12000;
export const CHAT_PANEL_MIN_WIDTH = 320;
export const CHAT_PANEL_DEFAULT_WIDTH = 400;
export const CHAT_PANEL_MAX_WIDTH = 640;
export const PENDING_ASSISTANT_STATUS_TEXT = '正在思考...';

let sessionCounter = 0;

export type ChatAction =
  | { type: 'toggle_collapsed' }
  | { type: 'new_session'; now: number; selectedText?: string }
  | { type: 'hydrate_history'; payload: ChatHistoryPayload }
  | { type: 'delete_session'; sessionId: string; now: number }
  | { type: 'switch_session'; sessionId: string }
  | { type: 'update_draft'; sessionId: string; draft: string }
  | { type: 'set_selected_text'; sessionId: string; selectedText: string }
  | { type: 'clear_selected_text'; sessionId: string }
  | { type: 'send_started'; sessionId: string; requestId: string; now: number }
  | {
      type: 'assistant_received';
      sessionId: string;
      requestId: string;
      answer: string;
      now: number;
    }
  | {
      type: 'send_failed';
      sessionId: string;
      requestId: string;
      message: string;
      now: number;
    }
  | { type: 'send_stopped'; sessionId: string; requestId: string };

function createSession(now: number, selectedText = ''): ChatSession {
  sessionCounter += 1;
  return {
    id: `s-${now}-${sessionCounter}`,
    title: '新聊天',
    createdAt: now,
    updatedAt: now,
    messages: [],
    draft: '',
    selectedText,
    status: 'idle',
  };
}

export function createInitialChatState(now = Date.now()): ChatState {
  const session = createSession(now);
  return {
    sessions: [session],
    activeSessionId: session.id,
    collapsed: false,
  };
}

function titleFromPrompt(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (!normalized) return '新聊天';
  return normalized.length > 32 ? `${normalized.slice(0, 32)}...` : normalized;
}

function sortAndLimitSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CHAT_SESSIONS);
}

function hydrateSession(session: ChatHistoryPayload['sessions'][number]): ChatSession {
  return {
    id: session.id,
    title: session.title || '新聊天',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: session.messages,
    draft: session.draft,
    selectedText: session.selectedText,
    status: 'idle',
  };
}

function updateSession(
  state: ChatState,
  sessionId: string,
  updater: (session: ChatSession) => ChatSession,
): ChatState {
  return {
    ...state,
    sessions: sortAndLimitSessions(
      state.sessions.map((session) =>
        session.id === sessionId ? updater(session) : session,
      ),
    ),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'toggle_collapsed':
      return { ...state, collapsed: !state.collapsed };
    case 'new_session': {
      const session = createSession(action.now, action.selectedText?.trim() ?? '');
      return {
        ...state,
        activeSessionId: session.id,
        collapsed: false,
        sessions: sortAndLimitSessions([session, ...state.sessions]),
      };
    }
    case 'hydrate_history': {
      const sessions = action.payload.sessions
        .map(hydrateSession)
        .slice(0, MAX_CHAT_SESSIONS);
      if (sessions.length === 0) return state;
      const requestedActiveSessionId = action.payload.activeSessionId;
      const activeSessionId =
        requestedActiveSessionId &&
        sessions.some((session) => session.id === requestedActiveSessionId)
          ? requestedActiveSessionId
          : sessions[0].id;
      return {
        ...state,
        activeSessionId,
        sessions,
      };
    }
    case 'delete_session': {
      const remainingSessions = state.sessions.filter(
        (session) => session.id !== action.sessionId,
      );
      if (remainingSessions.length === state.sessions.length) return state;
      if (remainingSessions.length === 0) {
        const session = createSession(action.now);
        return {
          ...state,
          activeSessionId: session.id,
          sessions: [session],
        };
      }
      return {
        ...state,
        activeSessionId:
          state.activeSessionId === action.sessionId
            ? remainingSessions[0].id
            : state.activeSessionId,
        sessions: remainingSessions,
      };
    }
    case 'switch_session':
      return state.sessions.some((session) => session.id === action.sessionId)
        ? { ...state, activeSessionId: action.sessionId, collapsed: false }
        : state;
    case 'update_draft':
      return updateSession(state, action.sessionId, (session) => ({
        ...session,
        draft: action.draft,
      }));
    case 'set_selected_text':
      return updateSession(state, action.sessionId, (session) => ({
        ...session,
        selectedText: action.selectedText.trim(),
      }));
    case 'clear_selected_text':
      return updateSession(state, action.sessionId, (session) => ({
        ...session,
        selectedText: '',
      }));
    case 'send_started':
      return updateSession(state, action.sessionId, (session) => {
        const prompt = session.draft.trim();
        if (!prompt) return session;
        return {
          ...session,
          title: session.messages.length === 0 ? titleFromPrompt(prompt) : session.title,
          updatedAt: action.now,
          status: 'pending',
          pendingRequestId: action.requestId,
          pendingPrompt: prompt,
          messages: [
            ...session.messages,
            {
              id: `m-${action.now}-user`,
              role: 'user',
              content: prompt,
              selectedText: session.selectedText || undefined,
            },
          ],
        };
      });
    case 'assistant_received':
      return updateSession(state, action.sessionId, (session) => {
        if (session.pendingRequestId !== action.requestId) return session;
        return {
          ...session,
          updatedAt: action.now,
          status: 'idle',
          pendingRequestId: undefined,
          pendingPrompt: undefined,
          draft: session.draft === session.pendingPrompt ? '' : session.draft,
          messages: [
            ...session.messages,
            {
              id: `m-${action.now}-assistant`,
              role: 'assistant',
              content: action.answer,
            },
          ],
        };
      });
    case 'send_failed':
      return updateSession(state, action.sessionId, (session) => {
        if (session.pendingRequestId !== action.requestId) return session;
        return {
          ...session,
          updatedAt: action.now,
          status: 'error',
          pendingRequestId: undefined,
          pendingPrompt: undefined,
          messages: [
            ...session.messages,
            {
              id: `m-${action.now}-error`,
              role: 'assistant',
              content: action.message,
              error: true,
            },
          ],
        };
      });
    case 'send_stopped':
      return updateSession(state, action.sessionId, (session) => {
        if (session.pendingRequestId !== action.requestId) return session;
        return {
          ...session,
          status: 'idle',
          pendingRequestId: undefined,
          pendingPrompt: undefined,
        };
      });
    default:
      return state;
  }
}

export function trimChatText(
  value: string,
  limit: number,
  marker: string,
): string {
  if (value.length <= limit) return value;
  const suffix = `\n\n${marker}`;
  const sliceLength = Math.max(0, limit - suffix.length);
  return `${value.slice(0, sliceLength)}${suffix}`;
}

export function summarizeSelectedText(
  value: string,
  limit = SELECTED_TEXT_SUMMARY_LIMIT,
): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  if (limit <= 3) return '.'.repeat(Math.max(0, limit));
  return `${normalized.slice(0, limit - 3)}...`;
}

export function shouldSubmitChatInput({
  key,
  shiftKey,
  isComposing = false,
}: {
  key: string;
  shiftKey: boolean;
  isComposing?: boolean;
}): boolean {
  return key === 'Enter' && !shiftKey && !isComposing;
}

export function clampChatPanelWidth(width: number): number {
  if (!Number.isFinite(width)) return CHAT_PANEL_DEFAULT_WIDTH;
  return Math.min(
    CHAT_PANEL_MAX_WIDTH,
    Math.max(CHAT_PANEL_MIN_WIDTH, Math.round(width)),
  );
}

export function getPendingAssistantStatusText(
  status: ChatSessionStatus,
): string {
  return status === 'pending' ? PENDING_ASSISTANT_STATUS_TEXT : '';
}

export function buildChatHistoryPayload(state: ChatState): ChatHistoryPayload {
  const sessions = state.sessions
    .filter(
      (session) =>
        session.messages.length > 0 ||
        Boolean(session.draft.trim()) ||
        Boolean(session.selectedText.trim()),
    )
    .map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages,
      draft: session.draft,
      selectedText: session.selectedText,
    }));
  const activeSessionId = sessions.some(
    (session) => session.id === state.activeSessionId,
  )
    ? state.activeSessionId
    : sessions[0]?.id;

  return {
    ...(activeSessionId ? { activeSessionId } : {}),
    sessions,
  };
}

export function buildOutgoingChatRequest(
  session: ChatSession,
  context: ChatRequestContext,
): ChatRequest {
  const pageContent = context.pageContent
    ? trimChatText(
        context.pageContent,
        PAGE_CONTENT_LIMIT,
        '[Page excerpt truncated]',
      )
    : undefined;
  const selectedText = session.selectedText
    ? trimChatText(
        session.selectedText,
        SELECTED_TEXT_LIMIT,
        '[Selected text truncated]',
      )
    : undefined;

  return {
    pageTitle: context.pageTitle,
    pageSlug: context.pageSlug,
    pageContent,
    selectedText,
    messages: session.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}
