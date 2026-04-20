import { create } from 'zustand';
import type { Tokens, DraftInfo, Page, TaskStatus, Task } from '../types';

type WikiStateBase = {
  page: Page;
  version: string;
  modelName: string;
  projectDir: string;
  draftInfo: DraftInfo | null;
  selectedIndex: number;
  catalogStatus: TaskStatus;
  catalogTokens: Tokens;
  tasks: Task[];
  taskIndex: number;
  totalTokens: Tokens;
};

interface WikiStore extends WikiStateBase {
  // State
  error: string | null;

  // Info
  setInfo: (ver: string, model: string, dir: string) => void;
  setDraft: (info: DraftInfo | null) => void;
  setPage: (page: Page) => void;

  // Navigation
  nav: (dir: 'up' | 'down') => void;
  taskNav: (dir: 'up' | 'down') => void;

  // Catalog
  setCatalogStatus: (status: TaskStatus) => void;
  setCatalogTokens: (tokens: Tokens) => void;

  // Tasks
  initTasks: (tasks: Array<{ id: string; title: string }>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskTokens: (id: string, tokens: Tokens) => void;

  // Summary
  complete: () => void;
  setError: (msg: string) => void;
}

/** 初始状态 */
const initialState: WikiStateBase & { error: string | null } = {
  page: 'home',
  version: '0.2.3',
  modelName: '',
  projectDir: '',
  draftInfo: null,
  selectedIndex: 0,
  catalogStatus: 'pending',
  catalogTokens: { in: 0, out: 0 },
  tasks: [],
  taskIndex: 0,
  totalTokens: { in: 0, out: 0 },
  error: null,
};

export const useWikiStore = create<WikiStore>((set) => ({
  ...initialState,

  setInfo: (ver, model, dir) =>
    set({ version: ver, modelName: model, projectDir: dir }),

  setDraft: (info) =>
    set({ draftInfo: info }),

  setPage: (page) =>
    set({ page }),

  nav: (dir) =>
    set((s) => ({
      selectedIndex: dir === 'up'
        ? Math.max(0, s.selectedIndex - 1)
        : Math.min(2, s.selectedIndex + 1),
    })),

  taskNav: (dir) =>
    set((s) => ({
      taskIndex: dir === 'up'
        ? Math.max(0, s.taskIndex - 1)
        : Math.min(s.tasks.length - 1, s.taskIndex + 1),
    })),

  setCatalogStatus: (status) =>
    set({ catalogStatus: status }),

  setCatalogTokens: (tokens) =>
    set({ catalogTokens: tokens }),

  initTasks: (tasks) =>
    set({
      page: 'wiki',
      tasks: tasks.map((t) => ({ ...t, status: 'pending' as TaskStatus })),
    }),

  setTaskStatus: (id, status) =>
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, status } : t),
    })),

  setTaskTokens: (id, tokens) =>
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, tokens } : t),
    })),

  complete: () =>
    set({ page: 'complete' }),

  setError: (msg) =>
    set({ page: 'error', error: msg }),
}));