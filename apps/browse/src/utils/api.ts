// apps/browse/src/utils/api.ts
import axios from 'axios';
import type { WikiOutput } from '@/types/wiki';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface WikiContentResponse {
  content: string;
}

export interface WikiSourceResponse {
  code: string;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

export default api;
