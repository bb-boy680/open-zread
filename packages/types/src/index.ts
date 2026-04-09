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

// DehydratedSkeleton - Dehydrator output
export interface DehydratedSkeleton {
  skeleton: Array<{
    file: string;
    content: string;
  }>;
  referenceMap: Record<string, number>;
}

// SkeletonItem - Single file skeleton
export interface SkeletonItem {
  file: string;
  content: string;
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
  associatedFiles?: string[];
}

// WikiOutput - Final output
export interface WikiOutput {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
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
  files: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
}