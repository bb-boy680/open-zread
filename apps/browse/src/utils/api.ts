// apps/browse/src/utils/api.ts
import axios from 'axios';
import type {
  ChatHistoryPayload,
  ChatRequest,
  ChatResponse,
} from '@/features/chat/types';
import type { WikiOutput } from '@/types/wiki';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const API_TIMEOUT_MS = 30000;

export interface WikiContentResponse {
  content: string;
}

export interface WikiSourceResponse {
  code: string;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

export const wikiApi = {
  getCatalog: async () => {
    const response = await api.get<WikiOutput>('/wiki/catalog');
    return response.data;
  },

  getContent: async (slug: string) => {
    const response = await api.get<WikiContentResponse>(`/wiki/content/${slug}`);
    return response.data;
  },

  getSource: async (filePath: string, startLine?: number, endLine?: number) => {
    const params = new URLSearchParams();
    params.append('file', filePath);
    if (startLine !== undefined) params.append('startLine', String(startLine));
    if (endLine !== undefined) params.append('endLine', String(endLine));
    const response = await api.get<WikiSourceResponse>(`/wiki/source?${params.toString()}`);
    return response.data;
  },
};

export const chatApi = {
  send: async (request: ChatRequest, signal?: AbortSignal) => {
    const response = await api.post<ChatResponse>('/chat', request, { signal });
    return response.data;
  },
};

export const chatHistoryApi = {
  load: async () => {
    const response = await api.get<ChatHistoryPayload>('/chat/history');
    return response.data;
  },

  save: async (payload: ChatHistoryPayload) => {
    const response = await api.put<ChatHistoryPayload>('/chat/history', payload);
    return response.data;
  },

  deleteSession: async (sessionId: string) => {
    const response = await api.delete<ChatHistoryPayload>(
      `/chat/history/${encodeURIComponent(sessionId)}`,
    );
    return response.data;
  },
};

export default api;
