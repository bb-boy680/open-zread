/**
 * Repo Map Types
 *
 * Three-layer progressive repo map for AI context
 */

/**
 * Repo Map Options
 */
export interface RepoMapOptions {
  tokenBudget: number;      // Token 预算（默认 2048）
  includeAll?: boolean;     // 强制包含所有文件
  maxSignatureLength?: number; // 签名最大长度（默认 80）
}

/**
 * File Priority Score
 */
export interface FilePriority {
  file: string;
  score: number;            // 综合优先级分数
  referenceCount: number;   // 来自 referenceMap
  exportCount: number;      // 导出数量
  depth: number;            // 目录深度（越浅越重要）
}

/**
 * Directory Tree Node
 */
export interface DirectoryTreeNode {
  name: string;
  type: 'file' | 'directory';
  path?: string;            // 文件节点：完整路径
  children?: DirectoryTreeNode[];
}

/**
 * Repo Map Output (Legacy - single layer)
 */
export interface RepoMapOutput {
  content: string;          // 树状格式化字符串
  tokenCount: number;       // 估算 Token 数
  fileCount: number;        // 包含的文件数
  topFiles: string[];       // Top 10 核心文件路径
}

// ==================== 三层 Repo Map Types ====================

/**
 * Layer 1: Directory Tree Output (纯目录结构)
 */
export interface DirectoryTreeOutput {
  content: string;          // 目录树字符串
  directories: string[];    // 所有目录路径列表
}

/**
 * Layer 2: Core Signatures Output (核心文件签名)
 */
export interface CoreSignaturesOutput {
  content: string;          // 核心签名字符串
  files: string[];          // 包含的核心文件列表
  threshold: number;        // 引用阈值 (Ref >= threshold)
}

/**
 * Layer 3: Module Details Output (模块完整详情)
 */
export interface ModuleDetailsOutput {
  content: string;          // 模块完整 Repo Map
  modulePath: string;       // 模块路径
  fileCount: number;        // 模块内文件数
  tokenCount: number;       // 估算 Token 数
}