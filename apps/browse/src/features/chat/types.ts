export type ChatRole = 'user' | 'assistant';
export type ChatSessionStatus = 'idle' | 'pending' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  selectedText?: string;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  draft: string;
  selectedText: string;
  status: ChatSessionStatus;
  pendingRequestId?: string;
  pendingPrompt?: string;
}

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
  collapsed: boolean;
}

export interface PersistedChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  draft: string;
  selectedText: string;
}

export interface ChatHistoryPayload {
  activeSessionId?: string;
  sessions: PersistedChatSession[];
}

export interface ChatRequest {
  pageTitle?: string;
  pageSlug?: string;
  pageContent?: string;
  selectedText?: string;
  messages: Array<{
    role: ChatRole;
    content: string;
  }>;
}

export interface ChatResponse {
  answer: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface ChatRequestContext {
  pageTitle?: string;
  pageSlug?: string;
  pageContent?: string;
}
