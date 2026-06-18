import type {
  CreateMessageResponse,
  LLMProvider,
  NormalizedMessageParam,
} from '@open-zread/agent-sdk';
import { createProvider } from '@open-zread/agent-sdk';
import type { AppConfig } from '@open-zread/types';
import { loadConfig } from '@open-zread/utils';

export interface BrowseChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BrowseChatRequest {
  pageTitle?: string;
  pageSlug?: string;
  pageContent?: string;
  selectedText?: string;
  messages: BrowseChatMessage[];
}

export interface BrowseChatResponse {
  answer: string;
  usage?: CreateMessageResponse['usage'];
}

export interface ChatPromptContext {
  pageTitle?: string;
  pageSlug?: string;
  pageContent?: string;
  selectedText?: string;
}

export interface BrowseChatDeps {
  loadConfig?: () => Promise<AppConfig>;
  createProvider?: (
    provider: string,
    opts: { apiKey?: string; baseURL?: string },
  ) => LLMProvider;
}

export interface SerializedBrowseChatError {
  status: number;
  body: {
    error: string;
    message: string;
  };
}

export class BrowseChatHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BrowseChatHttpError';
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isChatMessage(value: unknown): value is BrowseChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
}

export function validateChatRequest(input: unknown): BrowseChatRequest {
  if (!input || typeof input !== 'object') {
    throw new BrowseChatHttpError(
      400,
      'invalid_request',
      'chat request body must be an object',
    );
  }

  const raw = input as Record<string, unknown>;
  const rawMessages = raw.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new BrowseChatHttpError(
      400,
      'invalid_request',
      'messages must contain at least one item',
    );
  }
  if (!rawMessages.every(isChatMessage)) {
    throw new BrowseChatHttpError(
      400,
      'invalid_request',
      'messages must contain valid chat messages',
    );
  }

  const messages = rawMessages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
  const finalMessage = messages[messages.length - 1];
  if (finalMessage.role !== 'user') {
    throw new BrowseChatHttpError(
      400,
      'invalid_request',
      'final message must be from the user',
    );
  }

  return {
    pageTitle: readString(raw.pageTitle),
    pageSlug: readString(raw.pageSlug),
    pageContent: readString(raw.pageContent),
    selectedText: readString(raw.selectedText),
    messages,
  };
}

export function buildChatSystemPrompt(context: ChatPromptContext): string {
  const sections = [
    'You are a documentation reading assistant for Open Zread wiki pages.',
    'Answer primarily from the provided page context and selected text.',
    'If the provided context is insufficient, say what is missing instead of guessing.',
    'Use concise explanations by default.',
    'Prefer concrete references to concepts from the document.',
    'Do not claim access to files, project state, or runtime information beyond the supplied context.',
  ];

  if (context.pageTitle || context.pageSlug) {
    sections.push(
      `Current page: ${context.pageTitle ?? 'Untitled'}${
        context.pageSlug ? ` (${context.pageSlug})` : ''
      }`,
    );
  }
  if (context.selectedText) {
    sections.push(`Selected text:\n${context.selectedText}`);
  }
  if (context.pageContent) {
    sections.push(`Page excerpt:\n${context.pageContent}`);
  }

  return sections.join('\n\n');
}

export function buildProviderMessages(
  request: BrowseChatRequest,
): NormalizedMessageParam[] {
  return request.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export function extractAssistantText(response: CreateMessageResponse): string {
  return response.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export async function resolveBrowseChat(
  input: unknown,
  deps: BrowseChatDeps = {},
): Promise<BrowseChatResponse> {
  const request = validateChatRequest(input);
  const config = await (deps.loadConfig ?? loadConfig)();
  const llm = config.llm;

  if (!llm.provider || !llm.model || !llm.api_key) {
    throw new BrowseChatHttpError(
      400,
      'missing_config',
      'LLM provider, model, and API key must be configured',
    );
  }

  const provider = (deps.createProvider ?? createProvider)(llm.provider, {
    apiKey: llm.api_key,
    baseURL: llm.base_url ?? undefined,
  });
  const response = await provider.createMessage({
    model: llm.model,
    maxTokens: 1200,
    system: buildChatSystemPrompt(request),
    messages: buildProviderMessages(request),
  });
  const answer = extractAssistantText(response);

  return {
    answer: answer || '模型没有返回可显示的文本。',
    usage: response.usage,
  };
}

export function serializeBrowseChatError(
  error: unknown,
): SerializedBrowseChatError {
  if (error instanceof BrowseChatHttpError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'provider_error',
      message: 'LLM request failed',
    },
  };
}
