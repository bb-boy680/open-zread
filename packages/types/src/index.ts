// FileManifest - Scanner output
export interface FileManifest {
  files: Array<{
    path: string;
    hash: string;
    size: number;
    language: string;
    lastModified: string;
  }>;
  totalFiles: number;
  totalSize: number;
}

// FileInfo - Single file info
export interface FileInfo {
  path: string;
  hash: string;
  size: number;
  language: string;
  lastModified: string;
}

// SymbolManifest - Parser output
export interface SymbolManifest {
  symbols: Array<{
    file: string;
    exports: string[];
    functions: Array<{ name: string; signature: string }>;
    imports: string[];
    docstrings: string[];
  }>;
  loadedParsers: string[];
}

// SymbolInfo - Single file symbols
export interface SymbolInfo {
  file: string;
  exports: string[];
  functions: Array<{ name: string; signature: string }>;
  imports: string[];
  docstrings: string[];
}

// TechStackSummary - ScanAgent output
export interface TechStackSummary {
  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
  };
  projectType: string;
  entryPoints: string[];
}

// CoreModules - ClusterAgent output
export interface CoreModules {
  coreModules: Array<{
    name: string;
    files: string[];
    reason: string;
  }>;
  moduleGroups: Record<string, string[]>;
}

// WikiPage - Wiki page definition
export interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  level: string;
  type?: 'overview' | 'architecture' | 'code' | 'spec' | 'reference';
  /**
   * 关联的源文件或目录路径
   * - 文件路径: "packages/web-integration/src/index.ts"
   * - 目录路径: "packages/web-integration/src/" (以 / 结尾)
   * 后续生成 Wiki 内容时，会读取这些路径获取上下文
   */
  associatedFiles?: string[];
}

// WikiOutput - Final output
export interface WikiOutput {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
  techStackSummary?: TechStackSummary;
}

// AppConfig - Configuration
export interface AppConfig {
  language: string;
  doc_language: string;
  llm: {
    provider: string;
    model: string;
    api_key: string;
    base_url: string;
  };
  concurrency: {
    max_concurrent: number;
    max_retries: number;
  };
}

// CacheManifest - Cache manifest
export interface CacheManifest {
  version: string;
  generated_at: string;
  promptHash?: string;
  files: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
}

// ==================== Repo Map Types ====================

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
 * Repo Map Output
 */
export interface RepoMapOutput {
  content: string;          // 树状格式化字符串
  tokenCount: number;       // 估算 Token 数
  fileCount: number;        // 包含的文件数
  topFiles: string[];       // Top 10 核心文件路径
}