/**
 * Wiki Generate 类型定义
 */

export type Status = 'waiting' | 'loading' | 'completed' | 'failed';

/** 目录生成阶段 */
export type CatalogPhase = 'requesting' | 'responding' | 'tool';

/** 目录生成进度状态 */
export interface CatalogProgress {
  status: Status;
  phase?: CatalogPhase;
  currentTool?: string;      // tool 阶段
  upBytes?: number;          // Token 上行
  downBytes?: number;        // Token 下行
  durationMs?: number;       // 耗时
  error?: string;            // 错误信息
}