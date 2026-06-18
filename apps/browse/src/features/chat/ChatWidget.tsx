import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  ChevronDown,
  Copy,
  History,
  MessageCircle,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useWiki } from '@/hooks/useWiki';
import { chatApi, chatHistoryApi } from '@/utils/api';
import {
  buildChatHistoryPayload,
  buildOutgoingChatRequest,
  chatReducer,
  clampChatPanelWidth,
  createInitialChatState,
  getPendingAssistantStatusText,
  shouldSubmitChatInput,
  summarizeSelectedText,
} from './chatState';
import { useWikiTextSelection } from './useWikiTextSelection';

interface ChatWidgetProps {
  panelWidth: number;
  onCollapsedChange?: (collapsed: boolean) => void;
  onPanelWidthChange: (width: number) => void;
}

function requestId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function currentTime(): number {
  return Date.now();
}

function readErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }
  return error instanceof Error ? error.message : 'LLM request failed';
}

function ChatMessageBody({
  role,
  content,
  selectedText,
  error,
}: {
  role: 'user' | 'assistant';
  content: string;
  selectedText?: string;
  error?: boolean;
}) {
  if (role === 'user') {
    return (
      <>
        {selectedText && (
          <div className="chat-message-reference">
            <span>引用</span>
            <p>{summarizeSelectedText(selectedText)}</p>
          </div>
        )}
        <p>{content}</p>
      </>
    );
  }

  if (error) {
    return <p>{content}</p>;
  }

  return (
    <div className="chat-message-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatWidget({
  panelWidth,
  onCollapsedChange,
  onPanelWidthChange,
}: ChatWidgetProps) {
  const { currentPage, currentContent } = useWiki();
  const location = useLocation();
  const selectedText = useWikiTextSelection();
  const [state, dispatch] = useReducer(
    chatReducer,
    undefined,
    () => createInitialChatState(),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const abortControllersRef = useRef(new Map<string, AbortController>());
  const lastAppliedSelectionRef = useRef('');

  const activeSession = useMemo(
    () =>
      state.sessions.find((session) => session.id === state.activeSessionId) ??
      state.sessions[0],
    [state.activeSessionId, state.sessions],
  );

  useEffect(() => {
    const nextSelection = selectedText.trim();
    if (!nextSelection || !activeSession) return;
    if (nextSelection === lastAppliedSelectionRef.current) return;
    lastAppliedSelectionRef.current = nextSelection;
    dispatch({
      type: 'set_selected_text',
      sessionId: activeSession.id,
      selectedText: nextSelection,
    });
  }, [activeSession, selectedText]);

  useEffect(() => {
    onCollapsedChange?.(state.collapsed);
  }, [onCollapsedChange, state.collapsed]);

  useEffect(() => {
    let cancelled = false;

    void chatHistoryApi
      .load()
      .then((history) => {
        if (cancelled) return;
        if (history.sessions.length > 0) {
          dispatch({ type: 'hydrate_history', payload: history });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHistoryHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyHydrated) return undefined;

    const timeoutId = window.setTimeout(() => {
      void chatHistoryApi
        .save(buildChatHistoryPayload(state))
        .catch(() => undefined);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [historyHydrated, state]);

  if (!activeSession) return null;

  const hasPendingRequest = state.sessions.some(
    (session) => session.status === 'pending',
  );
  const hasPageContext = location.pathname !== '/';
  const pendingAssistantStatus = getPendingAssistantStatusText(
    activeSession.status,
  );

  const sendMessage = async () => {
    const prompt = activeSession.draft.trim();
    if (!prompt || activeSession.status === 'pending' || hasPendingRequest) return;

    const id = requestId();
    const controller = new AbortController();
    abortControllersRef.current.set(id, controller);
    dispatch({
      type: 'send_started',
      sessionId: activeSession.id,
      requestId: id,
      now: currentTime(),
    });

    const sessionForRequest = {
      ...activeSession,
      messages: [
        ...activeSession.messages,
        { id: `pending-${id}`, role: 'user' as const, content: prompt },
      ],
    };

    try {
      const response = await chatApi.send(
        buildOutgoingChatRequest(sessionForRequest, {
          pageTitle: hasPageContext ? currentPage?.title : undefined,
          pageSlug: hasPageContext ? currentPage?.slug : undefined,
          pageContent: hasPageContext ? currentContent || undefined : undefined,
        }),
        controller.signal,
      );
      dispatch({
        type: 'assistant_received',
        sessionId: activeSession.id,
        requestId: id,
        answer: response.answer,
        now: currentTime(),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: 'send_failed',
        sessionId: activeSession.id,
        requestId: id,
        message: readErrorMessage(error),
        now: currentTime(),
      });
    } finally {
      abortControllersRef.current.delete(id);
    }
  };

  const stopMessage = () => {
    if (!activeSession.pendingRequestId) return;
    abortControllersRef.current.get(activeSession.pendingRequestId)?.abort();
    dispatch({
      type: 'send_stopped',
      sessionId: activeSession.id,
      requestId: activeSession.pendingRequestId,
    });
  };

  const copyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      window.setTimeout(() => setCopiedMessageId(null), 1200);
    } catch {
      setCopiedMessageId(`failed-${messageId}`);
      window.setTimeout(() => setCopiedMessageId(null), 1200);
    }
  };

  const deleteSession = async (sessionId: string) => {
    const session = state.sessions.find((item) => item.id === sessionId);
    try {
      const history = await chatHistoryApi.deleteSession(sessionId);
      if (session?.pendingRequestId) {
        abortControllersRef.current.get(session.pendingRequestId)?.abort();
        abortControllersRef.current.delete(session.pendingRequestId);
      }
      if (history.sessions.length > 0) {
        dispatch({ type: 'hydrate_history', payload: history });
      } else {
        dispatch({ type: 'delete_session', sessionId, now: currentTime() });
      }
    } catch {
      // Keep local state unchanged if the server-side delete fails.
    }
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onPanelWidthChange(clampChatPanelWidth(window.innerWidth - moveEvent.clientX));
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.classList.remove('chat-resizing');
    };

    document.body.classList.add('chat-resizing');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  if (state.collapsed) {
    return (
      <button
        type="button"
        className="chat-collapsed-button"
        aria-label="展开聊天"
        onClick={() => dispatch({ type: 'toggle_collapsed' })}
      >
        <MessageCircle size={18} />
        {activeSession.status === 'pending' && <span className="chat-pending-dot" />}
      </button>
    );
  }

  return (
    <section
      className="chat-widget"
      aria-label="文档聊天"
      data-panel-width={panelWidth}
    >
      <div
        className="chat-resize-handle"
        role="separator"
        aria-label="调整聊天宽度"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={startResize}
      />
      <header className="chat-header">
        <div className="chat-title">
          <Bot size={16} />
          <span>{activeSession.title}</span>
        </div>
        <div className="chat-actions">
          <button
            type="button"
            aria-label="历史聊天"
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <History size={16} />
          </button>
          <button
            type="button"
            aria-label="新建聊天"
            onClick={() =>
              dispatch({
                type: 'new_session',
                now: currentTime(),
                selectedText,
              })
            }
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="折叠聊天"
            onClick={() => dispatch({ type: 'toggle_collapsed' })}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </header>

      {historyOpen && (
        <div className="chat-history">
          {state.sessions.map((session) => (
            <div
              key={session.id}
              className={`chat-history-item${
                session.id === activeSession.id ? ' is-active' : ''
              }`}
            >
              <button
                type="button"
                className="chat-history-select"
                onClick={() => {
                  dispatch({ type: 'switch_session', sessionId: session.id });
                  setHistoryOpen(false);
                }}
              >
                <span>{session.title}</span>
                <time>{new Date(session.updatedAt).toLocaleTimeString()}</time>
              </button>
              <button
                type="button"
                className="chat-history-delete"
                aria-label="删除聊天"
                onClick={() => void deleteSession(session.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {activeSession.messages.length === 0 && !pendingAssistantStatus ? (
          <p className="chat-empty">选中文档内容，或直接提问当前页面。</p>
        ) : (
          <>
            {activeSession.messages.map((message) => (
              <article
                key={message.id}
                className={`chat-message chat-message-${message.role}${
                  message.error ? ' is-error' : ''
                }`}
              >
                <ChatMessageBody
                  role={message.role}
                  content={message.content}
                  selectedText={message.selectedText}
                  error={message.error}
                />
                <button
                  type="button"
                  aria-label="复制消息"
                  onClick={() => void copyMessage(message.id, message.content)}
                >
                  <Copy size={14} />
                  {copiedMessageId === message.id && <span>已复制</span>}
                  {copiedMessageId === `failed-${message.id}` && <span>失败</span>}
                </button>
              </article>
            ))}
            {pendingAssistantStatus && (
              <article
                className="chat-message chat-message-assistant chat-message-pending"
                aria-live="polite"
                role="status"
              >
                <div className="chat-pending-answer">
                  <span>{pendingAssistantStatus}</span>
                  <span className="chat-typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </article>
            )}
          </>
        )}
      </div>

      <footer className="chat-composer">
        {activeSession.selectedText && (
          <div className="chat-reference">
            <span className="chat-reference-label">引用</span>
            <span className="chat-reference-summary">
              {summarizeSelectedText(activeSession.selectedText)}
            </span>
            <button
              type="button"
              aria-label="移除引用"
              onClick={() =>
                dispatch({
                  type: 'clear_selected_text',
                  sessionId: activeSession.id,
                })
              }
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="chat-composer-row">
          <textarea
            value={activeSession.draft}
            rows={2}
            placeholder="询问当前文档... Enter 发送，Shift+Enter 换行"
            onChange={(event) =>
              dispatch({
                type: 'update_draft',
                sessionId: activeSession.id,
                draft: event.target.value,
              })
            }
            onKeyDown={(event) => {
              if (
                shouldSubmitChatInput({
                  key: event.key,
                  shiftKey: event.shiftKey,
                  isComposing: event.nativeEvent.isComposing,
                })
              ) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          {activeSession.status === 'pending' ? (
            <button type="button" aria-label="停止回答" onClick={stopMessage}>
              <Square size={16} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="发送消息"
              onClick={() => void sendMessage()}
              disabled={!activeSession.draft.trim() || hasPendingRequest}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
