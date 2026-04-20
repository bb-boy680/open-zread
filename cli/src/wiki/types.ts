/**
 * Wiki TUI 类型定义
 */

/** 页面 */
export type Page = 'home' | 'catalog' | 'wiki' | 'complete' | 'error';

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

/** Token */
export interface Tokens {
  in: number;
  out: number;
}

/** 任务 */
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  tokens?: Tokens;
}

/** 草稿信息 */
export interface DraftInfo {
  exists: boolean;
  completed: number;
  total: number;
}

/** Wiki 状态 */
export interface WikiState {
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
  error: string | null;
}

/** 选择项 */
export const CHOICES = [
  { label: '继续生成', value: 'continue' },
  { label: '清除草稿并重新开始', value: 'clear' },
  { label: '取消', value: 'cancel' },
] as const;

export type Choice = typeof CHOICES[number]['value'];