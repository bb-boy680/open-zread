# Open-Zread 第一阶段实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 open-zread CLI 第一阶段，扫描项目并生成 wiki.json 蓝图

**Architecture:** pnpm-workspace monorepo，CLI 调用多个 SDK packages（scanner/parser/dehydrator/agents），使用 PI-SDK 编排 Agent 调用 LLM

**Tech Stack:** Bun + TypeScript + Ink + web-tree-sitter + PI-SDK + pnpm-workspace

---

## File Structure

```
open-zread/
├── cli/
│   ├── src/
│   │   ├── index.ts              # CLI 入口，串联所有模块
│   │   └── ui.tsx                # Ink UI 组件，显示进度
│   └ package.json
│
├── packages/
│   ├── config/
│   │   ├── src/
│   │   │   └── index.ts          # loadConfig, validateConfig
│   │   └ package.json
│   │
│   ├── types/
│   │   ├── src/
│   │   │   └── index.ts          # FileManifest, SymbolManifest, DehydratedSkeleton, etc.
│   │   └ package.json
│   │
│   ├── utils/
│   │   ├── src/
│   │   │   ├── file.ts           # readFile, writeFile, ensureDir
│   │   │   └── logger.ts         # logger.info, logger.error
│   │   └ package.json
│   │
│   ├── scanner/
│   │   ├── src/
│   │   │   ├── index.ts          # scanFiles, scanDirectory
│   │   │   ├── worker.ts         # Worker Thread hash 计算
│   │   │   └── constants.ts      # SCANNER_CONFIG
│   │   └ package.json
│   │
│   ├── parser/
│   │   ├── src/
│   │   │   ├── index.ts          # ParserManager, parseFiles
│   │   │   ├── wasm-loader.ts    # loadParser, downloadWasm
│   │   │   ├── language-map.ts   # 语言后缀到解析器映射
│   │   │   └── vue-handler.ts    # Vue SFC 二级解析
│   │   └ package.json
│   │
│   ├── dehydrator/
│   │   ├── src/
│   │   │   ├── index.ts          # dehydrate, buildSkeleton
│   │   │   ├── extractor.ts      # 提取 exports, imports, signatures
│   │   │   ├── reference-counter.ts  # 计算 referenceMap
│   │   │   └── constants.ts      # DEHYDRATOR_CONFIG
│   │   └ package.json
│   │
│   ├── cache/
│   │   ├── src/
│   │   │   ├── index.ts          # loadCache, saveCache, diffManifests
│   │   │   └── constants.ts      # CACHE_DIR, MANIFEST_FILE
│   │   └ package.json
│   │
│   ├── agents/
│   │   ├── src/
│   │   │   ├── orchestrator.ts   # AgentOrchestrator, runAgents
│   │   │   ├── llm-client.ts     # createLLMClient, callLLM
│   │   │   ├── scan-agent.ts     # ScanAgent prompt + output
│   │   │   ├── cluster-agent.ts  # ClusterAgent prompt + output
│   │   │   ├── outline-agent.ts  # OutlineAgent prompt + output
│   │   │   └── path-resolver.ts  # validateOutput, fuzzyMatch
│   │   └ package.json
│   │
│   └── output/
│   │   ├── src/
│   │   │   ├── index.ts          # generateWikiJson, ensureOutputDir
│   │   │   └── constants.ts      # OUTPUT_DIR, WIKI_FILE
│   │   └ package.json
│
├── pnpm-workspace.yaml
├── package.json                  # root package.json
├── tsconfig.json                 # root tsconfig (base config)
└── bunfig.toml                   # bun 配置
```

---

### Task 1: 项目初始化与 pnpm-workspace 配置

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `bunfig.toml`

- [ ] **Step 1: 创建 root package.json**

```json
{
  "name": "open-zread",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run cli/src/index.ts",
    "build": "bun run build:all",
    "build:all": "bun run --filter '*' build"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'cli'
  - 'packages/*'
```

- [ ] **Step 3: 创建 root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "references": [
    { "path": "./cli" },
    { "path": "./packages/config" },
    { "path": "./packages/types" },
    { "path": "./packages/utils" },
    { "path": "./packages/scanner" },
    { "path": "./packages/parser" },
    { "path": "./packages/dehydrator" },
    { "path": "./packages/cache" },
    { "path": "./packages/agents" },
    { "path": "./packages/output" }
  ]
}
```

- [ ] **Step 4: 创建 bunfig.toml**

```toml
install = { auto = "peer" }
test = { coverage = true }
```

- [ ] **Step 5: 初始化 pnpm**

Run: `pnpm install`
Expected: 创建 pnpm-lock.yaml 和 node_modules

---

### Task 2: 创建 packages/types 共享类型定义

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: 创建 packages/types/package.json**

```json
{
  "name": "@open-zread/types",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/types/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/types/src/index.ts**

```typescript
// FileManifest - Scanner 输出
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

// FileInfo - 单文件信息
export interface FileInfo {
  path: string;
  hash: string;
  size: number;
  language: string;
  lastModified: string;
}

// SymbolManifest - Parser 输出
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

// SymbolInfo - 单文件符号
export interface SymbolInfo {
  file: string;
  exports: string[];
  functions: Array<{ name: string; signature: string }>;
  imports: string[];
  docstrings: string[];
}

// DehydratedSkeleton - Dehydrator 输出
export interface DehydratedSkeleton {
  skeleton: Array<{
    file: string;
    content: string;
  }>;
  referenceMap: Record<string, number>;
}

// SkeletonItem - 单文件骨架
export interface SkeletonItem {
  file: string;
  content: string;
}

// TechStackSummary - ScanAgent 输出
export interface TechStackSummary {
  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
  };
  projectType: string;
  entryPoints: string[];
}

// CoreModules - ClusterAgent 输出
export interface CoreModules {
  coreModules: Array<{
    name: string;
    files: string[];
    reason: string;
  }>;
  moduleGroups: Record<string, string[]>;
}

// WikiPage - Wiki 页面定义
export interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  level: string;
  associatedFiles?: string[];
}

// WikiOutput - 最终输出
export interface WikiOutput {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
}

// AppConfig - 配置
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

// CacheManifest - 缓存清单
export interface CacheManifest {
  version: string;
  generated_at: string;
  files: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
}
```

- [ ] **Step 4: 构建 types package**

Run: `cd packages/types && pnpm build`
Expected: 生成 dist/index.js 和 dist/index.d.ts

---

### Task 3: 创建 packages/config 配置模块

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/src/index.ts`

- [ ] **Step 1: 创建 packages/config/package.json**

```json
{
  "name": "@open-zread/config",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/config/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/config/src/index.ts**

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { parse } from 'yaml';
import type { AppConfig } from '@open-zread/types';

const CONFIG_PATH = join(homedir(), '.zread', 'config.yaml');

export async function loadConfig(): Promise<AppConfig> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const rawConfig = parse(content);
    return validateConfig(rawConfig);
  } catch (error) {
    throw new Error(`配置文件读取失败: ${CONFIG_PATH}\n请确保配置文件存在并格式正确`);
  }
}

export function validateConfig(raw: unknown): AppConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('配置格式错误');
  }

  const config = raw as Record<string, unknown>;

  // 必填字段检查
  const required = ['language', 'doc_language', 'llm', 'concurrency'];
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`缺少必填配置: ${field}`);
    }
  }

  const llm = config.llm as Record<string, unknown>;
  if (!llm.provider || !llm.model || !llm.api_key || !llm.base_url) {
    throw new Error('LLM 配置不完整');
  }

  const concurrency = config.concurrency as Record<string, unknown>;
  if (typeof concurrency.max_concurrent !== 'number' || typeof concurrency.max_retries !== 'number') {
    throw new Error('concurrency 配置格式错误');
  }

  return {
    language: config.language as string,
    doc_language: config.doc_language as string,
    llm: {
      provider: llm.provider as string,
      model: llm.model as string,
      api_key: llm.api_key as string,
      base_url: llm.base_url as string,
    },
    concurrency: {
      max_concurrent: concurrency.max_concurrent as number,
      max_retries: concurrency.max_retries as number,
    },
  };
}

export function getDefaultLanguage(config: AppConfig): string {
  return config.language || config.doc_language || 'zh';
}
```

- [ ] **Step 4: 构建 config package**

Run: `cd packages/config && pnpm build`
Expected: 生成 dist 文件

---

### Task 4: 创建 packages/utils 工具模块

**Files:**
- Create: `packages/utils/package.json`
- Create: `packages/utils/tsconfig.json`
- Create: `packages/utils/src/file.ts`
- Create: `packages/utils/src/logger.ts`
- Create: `packages/utils/src/index.ts`

- [ ] **Step 1: 创建 packages/utils/package.json**

```json
{
  "name": "@open-zread/utils",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/utils/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/utils/src/file.ts**

```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, content, 'utf-8');
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeTextFile(path, content);
}

export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readTextFile(path);
  return JSON.parse(content) as T;
}

export function joinPath(...parts: string[]): string {
  return join(...parts);
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function getOutputDir(): string {
  return join(getProjectRoot(), '.open-zread');
}

export function getDraftsDir(): string {
  return join(getOutputDir(), 'drafts');
}

export function getCacheDir(): string {
  return join(getOutputDir(), 'cache');
}
```

- [ ] **Step 4: 创建 packages/utils/src/logger.ts**

```typescript
type LogLevel = 'info' | 'warn' | 'error' | 'success';

const COLORS = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  success: '\x1b[32m', // green
  reset: '\x1b[0m',
};

function formatTime(): string {
  const now = new Date();
  return now.toISOString().slice(11, 19);
}

export const logger = {
  info(message: string): void {
    console.log(`${COLORS.info}[INFO]${COLORS.reset} ${formatTime()} ${message}`);
  },

  warn(message: string): void {
    console.log(`${COLORS.warn}[WARN]${COLORS.reset} ${formatTime()} ${message}`);
  },

  error(message: string): void {
    console.log(`${COLORS.error}[ERROR]${COLORS.reset} ${formatTime()} ${message}`);
  },

  success(message: string): void {
    console.log(`${COLORS.success}[OK]${COLORS.reset} ${formatTime()} ${message}`);
  },

  progress(step: string, detail?: string): void {
    const detailStr = detail ? ` ${detail}` : '';
    console.log(`🔄 ${step}${detailStr}`);
  },
};
```

- [ ] **Step 5: 创建 packages/utils/src/index.ts**

```typescript
export * from './file';
export * from './logger';
```

- [ ] **Step 6: 构建 utils package**

Run: `cd packages/utils && pnpm build`
Expected: 生成 dist 文件

---

### Task 5: 创建 packages/scanner 扫描模块（Worker Threads 实现）

**Files:**
- Create: `packages/scanner/package.json`
- Create: `packages/scanner/tsconfig.json`
- Create: `packages/scanner/src/constants.ts`
- Create: `packages/scanner/src/worker.ts`        # Worker Thread Hash 计算
- Create: `packages/scanner/src/index.ts`

**重要说明：** 为了保持主线程（Ink UI）的响应速度，Hash 计算必须在 Worker 线程中执行。主线程只负责分发文件路径，Worker 线程池负责读取内容和计算 Hash。

- [ ] **Step 1: 创建 packages/scanner/package.json**

```json
{
  "name": "@open-zread/scanner",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*",
    "ignore": "^5.2.0",
    "glob": "^10.0.0",
    "crypto-hash": "^1.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/scanner/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/scanner/src/constants.ts**

```typescript
export const SCANNER_CONFIG = {
  max_workers: 4,
  max_file_size: 1024 * 1024,  // 1MB
  ignore_patterns: [
    'node_modules',
    '.git',
    '.open-zread',
    'dist',
    'build',
    'out',
    '*.test.ts',
    '*.spec.ts',
    '*.test.js',
    '*.spec.js',
    '*.min.js',
    '*.min.mjs',
    '*.d.ts',
    '*.map',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
  ],
};

// 语言检测映射
export const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.vue': 'vue',
  '.go': 'go',
  '.py': 'python',
  '.java': 'java',
  '.kt': 'kotlin',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.m': 'objc',
  '.scala': 'scala',
};
```

- [ ] **Step 4: 创建 packages/scanner/src/worker.ts**

```typescript
// Worker Thread: 负责 Hash 计算
// 主线程通过 postMessage 发送文件路径，Worker 返回 Hash 结果

import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { parentPort, workerData } from 'worker_threads';

interface HashTask {
  filePath: string;
}

interface HashResult {
  filePath: string;
  hash: string;
  error?: string;
}

async function calculateHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('md5').update(content).digest('hex').slice(0, 12);
}

// 监听主线程消息
parentPort?.on('message', async (task: HashTask) => {
  try {
    const hash = await calculateHash(task.filePath);
    const result: HashResult = { filePath: task.filePath, hash };
    parentPort?.postMessage(result);
  } catch (error) {
    const result: HashResult = {
      filePath: task.filePath,
      hash: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    parentPort?.postMessage(result);
  }
});
```

- [ ] **Step 5: 创建 packages/scanner/src/index.ts**

```typescript
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, relative, resolve } from 'path';
import { Worker } from 'worker_threads';
import Ignore from 'ignore';
import type { FileManifest, FileInfo } from '@open-zread/types';
import { logger, getProjectRoot } from '@open-zread/utils';
import { SCANNER_CONFIG, LANGUAGE_MAP } from './constants';

// 语言检测
function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'unknown';
}

// 创建 ignore 过滤器
async function createIgnoreFilter(projectRoot: string): Promise<Ignore> {
  const ig = Ignore();

  // 添加默认忽略规则
  SCANNER_CONFIG.ignore_patterns.forEach(pattern => ig.add(pattern));

  // 尝试读取 .gitignore
  try {
    const gitignorePath = join(projectRoot, '.gitignore');
    const gitignoreContent = await readFile(gitignorePath, 'utf-8');
    ig.add(gitignoreContent);
  } catch {
    // .gitignore 不存在，忽略
  }

  return ig;
}

// Worker 线程池 Hash 计算
function calculateHashWithWorker(
  filePaths: string[],
  maxWorkers: number = SCANNER_CONFIG.max_workers
): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const results = new Map<string, string>();
    const queue = [...filePaths];
    let activeWorkers = 0;
    let currentIndex = 0;

    const processNext = () => {
      if (currentIndex >= queue.length && activeWorkers === 0) {
        resolve(results);
        return;
      }

      while (activeWorkers < maxWorkers && currentIndex < queue.length) {
        const filePath = queue[currentIndex++];
        activeWorkers++;

        const worker = new Worker(join(__dirname, 'worker.js'));

        worker.on('message', (result: { filePath: string; hash: string; error?: string }) => {
          if (result.hash) {
            results.set(result.filePath, result.hash);
          }
          activeWorkers--;
          worker.terminate();
          processNext();
        });

        worker.on('error', (error) => {
          logger.warn(`Worker error: ${error.message}`);
          activeWorkers--;
          worker.terminate();
          processNext();
        });

        worker.postMessage({ filePath });
      }
    };

    processNext();
  });
}

// 递归扫描目录（仅收集文件路径，不计算 Hash）
async function collectFiles(
  dir: string,
  projectRoot: string,
  ig: Ignore
): Promise<Array<{ path: string; size: number; language: string; lastModified: string }>> {
  const files: Array<{ path: string; size: number; language: string; lastModified: string }> = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(projectRoot, fullPath);

    // 检查是否被忽略
    if (ig.ignores(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      // 递归扫描子目录
      const subFiles = await collectFiles(fullPath, projectRoot, ig);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const fileStat = await stat(fullPath);

      // 检查文件大小限制
      if (fileStat.size > SCANNER_CONFIG.max_file_size) {
        logger.warn(`文件过大，跳过: ${relativePath} (${fileStat.size} bytes)`);
        continue;
      }

      // 检查语言支持
      const language = detectLanguage(fullPath);
      if (language === 'unknown') {
        continue;
      }

      files.push({
        path: relativePath,
        size: fileStat.size,
        language,
        lastModified: fileStat.mtime.toISOString(),
      });
    }
  }

  return files;
}

// 主扫描函数（使用 Worker 线程池计算 Hash）
export async function scanFiles(projectRoot?: string): Promise<FileManifest> {
  const root = projectRoot || getProjectRoot();
  logger.progress('正在扫描项目', root);

  // Step 1: 收集文件信息（主线程，不计算 Hash）
  const ig = await createIgnoreFilter(root);
  const collectedFiles = await collectFiles(root, root, ig);

  if (collectedFiles.length === 0) {
    return { files: [], totalFiles: 0, totalSize: 0 };
  }

  logger.progress('正在计算文件 Hash', `${collectedFiles.length} 个文件`);

  // Step 2: 使用 Worker 线程池计算 Hash
  const projectRootResolved = resolve(root);
  const filePaths = collectedFiles.map(f => join(projectRootResolved, f.path));
  const hashMap = await calculateHashWithWorker(filePaths);

  // Step 3: 组装最终结果
  const files: FileInfo[] = collectedFiles.map(f => ({
    path: f.path,
    hash: hashMap.get(join(projectRootResolved, f.path)) || '',
    size: f.size,
    language: f.language,
    lastModified: f.lastModified,
  }));

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  logger.success(`已扫描 ${files.length} 个文件 (${totalSize} bytes)`);

  return {
    files,
    totalFiles: files.length,
    totalSize,
  };
}

// 导出常量
export { SCANNER_CONFIG, LANGUAGE_MAP };
```

- [ ] **Step 6: 构建 scanner package**

Run: `cd packages/scanner && pnpm build`
Expected: 生成 dist 文件

---

### Task 6: 创建 packages/cache 缓存模块

**Files:**
- Create: `packages/cache/package.json`
- Create: `packages/cache/tsconfig.json`
- Create: `packages/cache/src/constants.ts`
- Create: `packages/cache/src/index.ts`

- [ ] **Step 1: 创建 packages/cache/package.json**

```json
{
  "name": "@open-zread/cache",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/cache/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/cache/src/constants.ts**

```typescript
export const CACHE_FILES = {
  manifest: 'last_manifest.json',
  skeleton: 'last_skeleton.json',
};

export const CACHE_VERSION = '1.0';
```

- [ ] **Step 4: 创建 packages/cache/src/index.ts**

```typescript
import type { FileManifest, CacheManifest, DehydratedSkeleton } from '@open-zread/types';
import { getCacheDir, readJsonFile, writeJsonFile, ensureDir } from '@open-zread/utils';
import { CACHE_FILES, CACHE_VERSION } from './constants';

// 加载缓存的 manifest
export async function loadCachedManifest(): Promise<CacheManifest | null> {
  const cacheDir = getCacheDir();
  const manifestPath = join(cacheDir, CACHE_FILES.manifest);

  try {
    return await readJsonFile<CacheManifest>(manifestPath);
  } catch {
    return null;
  }
}

// 保存 manifest 到缓存
export async function saveCachedManifest(manifest: FileManifest): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureDir(cacheDir);

  const cacheManifest: CacheManifest = {
    version: CACHE_VERSION,
    generated_at: new Date().toISOString(),
    files: manifest.files.map(f => ({
      path: f.path,
      hash: f.hash,
      size: f.size,
    })),
  };

  const manifestPath = join(cacheDir, CACHE_FILES.manifest);
  await writeJsonFile(manifestPath, cacheManifest);
}

// 加载缓存的骨架
export async function loadCachedSkeleton(): Promise<DehydratedSkeleton | null> {
  const cacheDir = getCacheDir();
  const skeletonPath = join(cacheDir, CACHE_FILES.skeleton);

  try {
    return await readJsonFile<DehydratedSkeleton>(skeletonPath);
  } catch {
    return null;
  }
}

// 保存骨架到缓存
export async function saveCachedSkeleton(skeleton: DehydratedSkeleton): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureDir(cacheDir);

  const skeletonPath = join(cacheDir, CACHE_FILES.skeleton);
  await writeJsonFile(skeletonPath, skeleton);
}

// 对比两个 manifest，找出变化的文件
export function diffManifests(
  cached: CacheManifest,
  current: FileManifest
): { added: string[]; modified: string[]; removed: string[] } {
  const cachedMap = new Map(cached.files.map(f => [f.path, f.hash]));
  const currentMap = new Map(current.files.map(f => [f.path, f.hash]));

  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  // 检查新增和修改
  for (const [path, hash] of currentMap) {
    if (!cachedMap.has(path)) {
      added.push(path);
    } else if (cachedMap.get(path) !== hash) {
      modified.push(path);
    }
  }

  // 检查删除
  for (const [path] of cachedMap) {
    if (!currentMap.has(path)) {
      removed.push(path);
    }
  }

  return { added, modified, removed };
}

// 检查是否需要重新处理
export function needsReprocess(
  cached: CacheManifest | null,
  current: FileManifest
): boolean {
  if (!cached) return true;

  const diff = diffManifests(cached, current);
  return diff.added.length > 0 || diff.modified.length > 0 || diff.removed.length > 0;
}

import { join } from 'path';
```

- [ ] **Step 5: 构建 cache package**

Run: `cd packages/cache && pnpm build`
Expected: 生成 dist 文件

---

### Task 7: 创建 packages/parser 解析模块

**Files:**
- Create: `packages/parser/package.json`
- Create: `packages/parser/tsconfig.json`
- Create: `packages/parser/src/constants.ts`
- Create: `packages/parser/src/language-map.ts`
- Create: `packages/parser/src/wasm-loader.ts`
- Create: `packages/parser/src/vue-handler.ts`
- Create: `packages/parser/src/index.ts`

- [ ] **Step 1: 创建 packages/parser/package.json**

```json
{
  "name": "@open-zread/parser",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*",
    "web-tree-sitter": "^0.20.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/parser/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/parser/src/constants.ts**

```typescript
// WASM 解析器 CDN 源
export const WASM_CDN_URL = 'https://tree-sitter.github.io/tree-sitter/assets/wasm';

// WASM 文件命名映射
export const WASM_FILE_MAP: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  vue: 'tree-sitter-vue.wasm',
  go: 'tree-sitter-go.wasm',
  python: 'tree-sitter-python.wasm',
};

// 本地缓存目录
export const PARSER_CACHE_DIR = '~/.zread/parsers';
```

- [ ] **Step 4: 创建 packages/parser/src/language-map.ts**

```typescript
// 语言到 Tree-sitter 语言名的映射
export const LANGUAGE_TO_PARSER: Record<string, string> = {
  typescript: 'typescript',
  tsx: 'tsx',
  javascript: 'javascript',
  jsx: 'javascript',
  vue: 'vue',
  go: 'go',
  python: 'python',
};

// 检查是否支持该语言
export function isLanguageSupported(language: string): boolean {
  return LANGUAGE_TO_PARSER[language] !== undefined;
}

// 获取解析器名称
export function getParserName(language: string): string | null {
  return LANGUAGE_TO_PARSER[language] || null;
}
```

- [ ] **Step 5: 创建 packages/parser/src/wasm-loader.ts**

```typescript
import { join, homedir } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import Parser from 'web-tree-sitter';
import { WASM_CDN_URL, WASM_FILE_MAP, PARSER_CACHE_DIR } from './constants';
import { logger } from '@open-zread/utils';

const parserCache = new Map<string, Parser.Language>();

// 获取本地缓存路径
function getLocalCachePath(): string {
  return PARSER_CACHE_DIR.replace('~', homedir());
}

// 确保 WASM 缓存目录存在
function ensureCacheDir(): void {
  const cacheDir = getLocalCachePath();
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

// 下载 WASM 文件
async function downloadWasm(parserName: string): Promise<Buffer> {
  const wasmFile = WASM_FILE_MAP[parserName];
  if (!wasmFile) {
    throw new Error(`未知的解析器: ${parserName}`);
  }

  const url = `${WASM_CDN_URL}/${wasmFile}`;
  logger.info(`正在下载 WASM: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`WASM 下载失败: ${parserName}\n请手动下载至 ~/.zread/parsers/`);
  }
}

// 加载解析器
export async function loadParser(parserName: string): Promise<Parser.Language> {
  // 检查缓存
  if (parserCache.has(parserName)) {
    return parserCache.get(parserName)!;
  }

  ensureCacheDir();
  const cacheDir = getLocalCachePath();
  const wasmPath = join(cacheDir, WASM_FILE_MAP[parserName]);

  let wasmBuffer: Buffer;

  // 检查本地缓存
  if (existsSync(wasmPath)) {
    logger.info(`使用本地缓存: ${parserName}`);
    wasmBuffer = readFileSync(wasmPath);
  } else {
    // 下载并缓存
    wasmBuffer = await downloadWasm(parserName);
    writeFileSync(wasmPath, wasmBuffer);
    logger.success(`WASM 已缓存: ${parserName}`);
  }

  // 初始化 Parser
  await Parser.init();
  const language = await Parser.Language.load(wasmBuffer);

  // 存入内存缓存
  parserCache.set(parserName, language);

  return language;
}

// 批量加载解析器
export async function loadParsers(languages: string[]): Promise<Map<string, Parser.Language>> {
  const parsers = new Map<string, Parser.Language>();

  for (const lang of languages) {
    const parserName = LANGUAGE_TO_PARSER[lang];
    if (parserName) {
      try {
        const parser = await loadParser(parserName);
        parsers.set(lang, parser);
      } catch (error) {
        logger.warn(`解析器加载失败: ${lang}`);
      }
    }
  }

  return parsers;
}

import { LANGUAGE_TO_PARSER } from './language-map';
```

- [ ] **Step 6: 创建 packages/parser/src/vue-handler.ts**

```typescript
import Parser from 'web-tree-sitter';
import { logger } from '@open-zread/utils';

// Vue SFC script 块提取
export function extractVueScript(source: string): { scriptContent: string; scriptLang: string } | null {
  // 匹配 <script> 或 <script lang="ts">
  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    return null;
  }

  const scriptTag = scriptMatch[0];
  const scriptContent = scriptMatch[1].trim();

  // 检测语言
  const langMatch = scriptTag.match(/lang="(\w+)"/);
  const scriptLang = langMatch ? langMatch[1] : 'javascript';

  return { scriptContent, scriptLang };
}

// 解析 Vue SFC
export async function parseVueSfc(
  source: string,
  vueParser: Parser.Language,
  tsParser?: Parser.Language
): Promise<{ imports: string[]; exports: string[] }> {
  const result = { imports: [], exports: [] };

  // 使用 Vue parser 解析整体结构
  const vueTree = vueParser.parse(source);
  const scriptNode = vueTree.rootNode.childForFieldName('script');

  if (!scriptNode) {
    return result;
  }

  // 提取 script 内容
  const scriptInfo = extractVueScript(source);
  if (!scriptInfo) {
    return result;
  }

  // 使用 TS/JS parser 二次解析 script
  const parser = scriptInfo.scriptLang === 'ts' ? tsParser : vueParser;
  if (!parser) {
    logger.warn('Vue script 解析器未加载');
    return result;
  }

  const scriptTree = parser.parse(scriptInfo.scriptContent);

  // 提取 imports 和 exports
  for (const child of scriptTree.rootNode.children) {
    if (child.type === 'import_statement') {
      result.imports.push(child.text);
    }
    if (child.type === 'export_statement') {
      result.exports.push(child.text);
    }
  }

  vueTree.delete();
  scriptTree.delete();

  return result;
}
```

- [ ] **Step 7: 创建 packages/parser/src/index.ts**

```typescript
import Parser from 'web-tree-sitter';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { FileManifest, SymbolManifest, SymbolInfo } from '@open-zread/types';
import { logger, getProjectRoot, readTextFile } from '@open-zread/utils';
import { isLanguageSupported, getParserName } from './language-map';
import { loadParser, loadParsers } from './wasm-loader';
import { extractVueScript, parseVueSfc } from './vue-handler';

// SCM Queries - 使用 Tree-sitter S-expression 语法进行精准提取
const SCM_QUERIES: Record<string, string> = {
  typescript: `
    (import_statement) @import
    (export_statement) @export
    (function_declaration name: (identifier) @fn_name) @fn
    (arrow_function) @arrow_fn
    (class_declaration name: (type_identifier) @class_name) @class
    (interface_declaration name: (type_identifier) @iface_name) @iface
    (method_definition name: (property_identifier) @method_name) @method
  `,
  javascript: `
    (import_statement) @import
    (export_statement) @export
    (function_declaration name: (identifier) @fn_name) @fn
    (arrow_function) @arrow_fn
    (class_declaration name: (identifier) @class_name) @class
    (method_definition name: (property_identifier) @method_name) @method
  `,
  go: `
    (import_declaration) @import
    (function_declaration name: (identifier) @fn_name) @fn
    (type_declaration) @type
  `,
  python: `
    (import_statement) @import
    (function_definition name: (identifier) @fn_name) @fn
    (class_definition name: (identifier) @class_name) @class
  `,
};

// 使用 SCM Query 提取符号
function extractWithQuery(
  tree: Parser.Tree,
  language: string,
  parser: Parser.Language
): { imports: string[]; exports: string[]; functions: Array<{ name: string; signature: string }> } {
  const queryStr = SCM_QUERIES[language];
  if (!queryStr) {
    // 回退到基础遍历
    return extractBasic(tree);
  }

  try {
    const query = parser.query(queryStr);
    const matches = query.matches(tree.rootNode);

    const imports: string[] = [];
    const exports: string[] = [];
    const functions: Array<{ name: string; signature: string }> = [];

    for (const match of matches) {
      for (const capture of match.captures) {
        const node = capture.node;
        const name = capture.name;

        if (name === 'import') {
          imports.push(node.text);
        } else if (name === 'export') {
          exports.push(node.text);
        } else if (name === 'fn' || name === 'arrow_fn' || name === 'method') {
          const fnNameNode = node.childForFieldName('name');
          const fnName = fnNameNode?.text || 'anonymous';
          functions.push({
            name: fnName,
            signature: node.text.slice(0, 150),
          });
        }
      }
    }

    return { imports, exports, functions };
  } catch (error) {
    logger.warn(`SCM Query 执行失败，回退到基础遍历: ${language}`);
    return extractBasic(tree);
  }
}

// 基础遍历（回退方案）
function extractBasic(tree: Parser.Tree): { imports: string[]; exports: string[]; functions: Array<{ name: string; signature: string }> } {
  const imports: string[] = [];
  const exports: string[] = [];
  const functions: Array<{ name: string; signature: string }> = [];

  for (const child of tree.rootNode.children) {
    if (child.type === 'import_statement' || child.type === 'import_declaration') {
      imports.push(child.text);
    }
    if (child.type.startsWith('export')) {
      exports.push(child.text);
    }
    if (child.type === 'function_declaration') {
      const nameNode = child.childForFieldName('name');
      if (nameNode) {
        functions.push({
          name: nameNode.text,
          signature: child.text.slice(0, 100),
        });
      }
    }
  }

  return { imports, exports, functions };
}

// 解析单个文件（使用 SCM Query）
async function parseFile(
  filePath: string,
  language: string,
  parsers: Map<string, Parser.Language>
): Promise<SymbolInfo | null> {
  const projectRoot = getProjectRoot();
  const fullPath = join(projectRoot, filePath);
  const source = await readTextFile(fullPath);

  const parser = parsers.get(language);
  if (!parser) {
    return null;
  }

  // Vue 特殊处理
  if (language === 'vue') {
    const vueParser = parser;
    const tsParser = parsers.get('typescript') || parsers.get('tsx');

    const vueResult = await parseVueSfc(source, vueParser, tsParser);
    return {
      file: filePath,
      exports: vueResult.exports,
      functions: [],
      imports: vueResult.imports,
      docstrings: [],
    };
  }

  // 使用 SCM Query 进行精准解析
  const tree = parser.parse(source);
  const { imports, exports, functions } = extractWithQuery(tree, language, parser);

  tree.delete();

  return {
    file: filePath,
    exports,
    functions,
    imports,
    docstrings: [],
  };
}

// 主解析函数
export async function parseFiles(manifest: FileManifest): Promise<SymbolManifest> {
  logger.progress('正在加载解析器');

  // 统计需要的语言
  const languages = [...new Set(manifest.files.map(f => f.language))];
  const supportedLanguages = languages.filter(isLanguageSupported);

  logger.info(`需要加载解析器: ${supportedLanguages.join(', ')}`);

  // 加载解析器
  const parsers = await loadParsers(supportedLanguages);
  const loadedParsers = [...parsers.keys()];

  logger.success(`已加载 ${loadedParsers.length} 个解析器`);

  // 解析文件
  logger.progress('正在提取符号');

  const symbols: SymbolInfo[] = [];
  for (const file of manifest.files) {
    if (!isLanguageSupported(file.language)) {
      continue;
    }

    try {
      const symbolInfo = await parseFile(file.path, file.language, parsers);
      if (symbolInfo) {
        symbols.push(symbolInfo);
      }
    } catch (error) {
      logger.warn(`解析失败: ${file.path}`);
    }
  }

  logger.success(`已提取 ${symbols.length} 个文件的符号`);

  return {
    symbols,
    loadedParsers,
  };
}

// 导出子模块
export * from './wasm-loader';
export * from './language-map';
export * from './vue-handler';
```

- [ ] **Step 8: 构建 parser package**

Run: `cd packages/parser && pnpm build`
Expected: 生成 dist 文件

---

### Task 8: 创建 packages/dehydrator 脱水模块

**Files:**
- Create: `packages/dehydrator/package.json`
- Create: `packages/dehydrator/tsconfig.json`
- Create: `packages/dehydrator/src/constants.ts`
- Create: `packages/dehydrator/src/reference-counter.ts`
- Create: `packages/dehydrator/src/index.ts`

- [ ] **Step 1: 创建 packages/dehydrator/package.json**

```json
{
  "name": "@open-zread/dehydrator",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/dehydrator/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/dehydrator/src/constants.ts**

```typescript
export const DEHYDRATOR_CONFIG = {
  max_file_lines: 10000,       // 单文件行数上限
  header_lines_limit: 500,     // 大文件截断保留行数
};
```

- [ ] **Step 4: 创建 packages/dehydrator/src/reference-counter.ts**

```typescript
import type { SymbolManifest } from '@open-zread/types';

// 计算引用次数
export function countReferences(symbols: SymbolManifest): Record<string, number> {
  const referenceMap: Record<string, number> = {};

  // 初始化所有文件计数为 0
  for (const symbol of symbols.symbols) {
    referenceMap[symbol.file] = 0;
  }

  // 分析每个文件的 imports，统计被引用次数
  for (const symbol of symbols.symbols) {
    for (const importStatement of symbol.imports) {
      // 提取导入路径
      const importPath = extractImportPath(importStatement);
      if (importPath) {
        // 查找匹配的文件
        for (const targetSymbol of symbols.symbols) {
          if (isImportMatch(importPath, targetSymbol.file)) {
            referenceMap[targetSymbol.file] = (referenceMap[targetSymbol.file] || 0) + 1;
          }
        }
      }
    }
  }

  return referenceMap;
}

// 提取 import 路径
function extractImportPath(importStatement: string): string | null {
  // 匹配 import ... from 'path' 或 import ... from "path"
  const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

// 检查 import 是否匹配文件路径
function isImportMatch(importPath: string, filePath: string): boolean {
  // 相对路径匹配
  if (importPath.startsWith('.')) {
    // 简化匹配：检查文件名是否相同
    const importName = importPath.split('/').pop() || '';
    const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return importName === fileName || importName === fileName.replace(/\.[^.]+$/, '');
  }

  return false;
}
```

- [ ] **Step 5: 创建 packages/dehydrator/src/index.ts**

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SymbolManifest, DehydratedSkeleton, SkeletonItem } from '@open-zread/types';
import { logger, getProjectRoot } from '@open-zread/utils';
import { DEHYDRATOR_CONFIG } from './constants';
import { countReferences } from './reference-counter';

// 生成骨架代码
function buildSkeletonContent(symbol: SymbolManifest['symbols'][0], source: string): string {
  const lines = source.split('\n');

  // 截断大文件
  const limitedLines = lines.slice(0, DEHYDRATOR_CONFIG.header_lines_limit);

  // 构建骨架：保留 imports、exports、签名，去除函数体
  const skeletonLines: string[] = [];

  // 添加 docstring
  if (symbol.docstrings.length > 0) {
    skeletonLines.push(symbol.docstrings[0]);
  }

  // 添加 imports
  for (const imp of symbol.imports) {
    skeletonLines.push(imp);
  }

  // 添加 exports 和签名
  for (const exp of symbol.exports) {
    // 截断过长的导出
    const trimmed = exp.length > 200 ? exp.slice(0, 200) + '...' : exp;
    skeletonLines.push(trimmed);
  }

  for (const fn of symbol.functions) {
    skeletonLines.push(fn.signature);
  }

  return skeletonLines.join('\n');
}

// 主脱水函数
export async function dehydrate(symbols: SymbolManifest): Promise<DehydratedSkeleton> {
  logger.progress('正在脱水压缩');

  const projectRoot = getProjectRoot();
  const skeleton: SkeletonItem[] = [];

  for (const symbol of symbols.symbols) {
    try {
      const fullPath = join(projectRoot, symbol.file);
      const source = await readFile(fullPath, 'utf-8');

      // 检查文件大小
      const lines = source.split('\n');
      if (lines.length > DEHYDRATOR_CONFIG.max_file_lines) {
        logger.warn(`文件过大，截断: ${symbol.file} (${lines.length} 行)`);
      }

      const content = buildSkeletonContent(symbol, source);
      skeleton.push({ file: symbol.file, content });
    } catch (error) {
      logger.warn(`脱水失败: ${symbol.file}`);
    }
  }

  // 计算引用次数
  const referenceMap = countReferences(symbols);

  logger.success(`骨架生成完成，共 ${skeleton.length} 个文件`);

  return {
    skeleton,
    referenceMap,
  };
}

// 导出子模块
export * from './reference-counter';
export { DEHYDRATOR_CONFIG };
```

- [ ] **Step 6: 构建 dehydrator package**

Run: `cd packages/dehydrator && pnpm build`
Expected: 生成 dist 文件

---

### Task 9: 创建 packages/agents 智能体模块

**Files:**
- Create: `packages/agents/package.json`
- Create: `packages/agents/tsconfig.json`
- Create: `packages/agents/src/llm-client.ts`
- Create: `packages/agents/src/path-resolver.ts`
- Create: `packages/agents/src/scan-agent.ts`
- Create: `packages/agents/src/cluster-agent.ts`
- Create: `packages/agents/src/outline-agent.ts`
- Create: `packages/agents/src/orchestrator.ts`
- Create: `packages/agents/src/index.ts`

- [ ] **Step 1: 创建 packages/agents/package.json**

```json
{
  "name": "@open-zread/agents",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/config": "workspace:*",
    "@open-zread/utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/agents/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/agents/src/llm-client.ts**

```typescript
import type { AppConfig } from '@open-zread/types';
import { logger } from '@open-zread/utils';

interface LLMRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// 调用 LLM API
export async function callLLM(
  config: AppConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const request: LLMRequest = {
    model: config.llm.model,
    messages,
    max_tokens: 4000,
    temperature: 0.7,
  };

  logger.info(`正在调用 LLM: ${config.llm.model}`);

  try {
    const response = await fetch(config.llm.base_url + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm.api_key}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`LLM API 错误: ${response.status}`);
    }

    const data: LLMResponse = await response.json();
    const content = data.choices[0]?.message?.content || '';

    logger.success('LLM 响应成功');
    return content;
  } catch (error) {
    logger.error(`LLM 调用失败: ${error}`);
    throw error;
  }
}

// 解析 JSON 响应
export function parseJsonResponse(response: string): unknown {
  // 尝试提取 JSON 块
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('响应中未找到 JSON');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('JSON 解析失败');
  }
}
```

- [ ] **Step 4: 创建 packages/agents/src/path-resolver.ts`

```typescript
import type { FileManifest, WikiPage } from '@open-zread/types';
import { logger } from '@open-zread/utils';

// 校验并修正文件路径
export function validateOutput(
  pages: WikiPage[],
  manifest: FileManifest
): WikiPage[] {
  const validPaths = new Set(manifest.files.map(f => f.path));

  return pages.map(page => {
    if (!page.associatedFiles) {
      return page;
    }

    const validatedFiles: string[] = [];

    for (const filePath of page.associatedFiles) {
      // 精确匹配
      if (validPaths.has(filePath)) {
        validatedFiles.push(filePath);
        continue;
      }

      // 模糊匹配
      const normalizedPath = filePath.replace(/[/\\]/g, '/');
      const match = manifest.files.find(
        f => f.path.replace(/[/\\]/g, '/') === normalizedPath
      );

      if (match) {
        validatedFiles.push(match.path);
        logger.info(`路径修正: ${filePath} -> ${match.path}`);
      } else {
        logger.warn(`路径不存在，已剔除: ${filePath}`);
      }
    }

    return { ...page, associatedFiles: validatedFiles };
  });
}
```

- [ ] **Step 5: 创建 packages/agents/src/scan-agent.ts**

```typescript
import type { FileManifest, TechStackSummary, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse } from './llm-client';
import { logger } from '@open-zread/utils';

const SYSTEM_PROMPT = `你是一个技术栈分析专家。分析项目的文件结构，识别技术栈、框架类型和入口文件。
输出格式必须是 JSON。`;

const USER_PROMPT_TEMPLATE = `分析以下文件清单，识别项目的技术栈：

文件总数: {totalFiles}
语言分布: {languageStats}
文件列表（前 50 个）:
{fileList}

输出 JSON 格式:
{
  "techStack": {
    "languages": ["..."],
    "frameworks": ["..."],
    "buildTools": ["..."]
  },
  "projectType": "...",
  "entryPoints": ["..."]
}`;

// 统计语言分布
function buildLanguageStats(manifest: FileManifest): string {
  const stats: Record<string, number> = {};
  for (const file of manifest.files) {
    stats[file.language] = (stats[file.language] || 0) + 1;
  }
  return Object.entries(stats)
    .map(([lang, count]) => `${lang}: ${count}`)
    .join(', ');
}

// ScanAgent
export async function runScanAgent(
  manifest: FileManifest,
  config: AppConfig
): Promise<TechStackSummary> {
  logger.progress('ScanAgent: 正在识别技术栈');

  const languageStats = buildLanguageStats(manifest);
  const fileList = manifest.files
    .slice(0, 50)
    .map(f => f.path)
    .join('\n');

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{totalFiles}', manifest.totalFiles.toString())
    .replace('{languageStats}', languageStats)
    .replace('{fileList}', fileList);

  const response = await callLLM(config, prompt, SYSTEM_PROMPT);
  const result = parseJsonResponse(response) as TechStackSummary;

  logger.success('ScanAgent: 技术栈识别完成');
  return result;
}
```

- [ ] **Step 6: 创建 packages/agents/src/cluster-agent.ts**

```typescript
import type { DehydratedSkeleton, TechStackSummary, CoreModules, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse } from './llm-client';
import { logger } from '@open-zread/utils';

const SYSTEM_PROMPT = `你是一个代码架构分析专家。分析骨架代码和引用关系，识别核心模块并分组。
输出格式必须是 JSON。`;

const USER_PROMPT_TEMPLATE = `根据以下骨架代码和引用关系，识别核心模块：

技术栈: {techStack}
引用次数统计（高频文件）:
{referenceMap}

骨架代码（前 20 个文件）:
{skeleton}

输出 JSON 格式:
{
  "coreModules": [
    { "name": "...", "files": ["..."], "reason": "..." }
  ],
  "moduleGroups": {
    "入门指南": ["..."],
    "核心功能": ["..."],
    "高级特性": ["..."]
  }
}`;

// ClusterAgent
export async function runClusterAgent(
  skeleton: DehydratedSkeleton,
  techStack: TechStackSummary,
  config: AppConfig
): Promise<CoreModules> {
  logger.progress('ClusterAgent: 正在标记核心模块');

  // 提取高频引用文件
  const highRefFiles = Object.entries(skeleton.referenceMap)
    .filter(([_, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, count]) => `${path}: ${count} 次`)
    .join('\n');

  // 提取骨架摘要
  const skeletonSummary = skeleton.skeleton
    .slice(0, 20)
    .map(s => `--- ${s.file} ---\n${s.content.slice(0, 200)}...`)
    .join('\n\n');

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{techStack}', JSON.stringify(techStack.techStack))
    .replace('{referenceMap}', highRefFiles)
    .replace('{skeleton}', skeletonSummary);

  const response = await callLLM(config, prompt, SYSTEM_PROMPT);
  const result = parseJsonResponse(response) as CoreModules;

  logger.success('ClusterAgent: 核心模块标记完成');
  return result;
}
```

- [ ] **Step 7: 创建 packages/agents/src/outline-agent.ts**

```typescript
import type { TechStackSummary, CoreModules, FileManifest, WikiPage, AppConfig } from '@open-zread/types';
import { callLLM, parseJsonResponse } from './llm-client';
import { validateOutput } from './path-resolver';
import { logger } from '@open-zread/utils';

const SYSTEM_PROMPT = `你是一个文档规划专家。根据项目的技术栈和核心模块，设计 Wiki 目录结构。
输出格式必须是 JSON。
注意：不要生成不存在的文件路径。`;

const USER_PROMPT_TEMPLATE = `根据项目的技术栈和核心模块，设计 Wiki 目录结构：

技术栈: {techStack}
核心模块: {coreModules}
语言偏好: {language}

现有文件路径（仅供引用，不要创造新路径）:
{validPaths}

输出 JSON 格式:
{
  "pages": [
    {
      "slug": "1-xiang-mu-gai-shu",
      "title": "项目概述",
      "file": "1-xiang-mu-gai-shu.md",
      "section": "入门指南",
      "level": "Beginner",
      "associatedFiles": ["src/index.ts"]
    }
  ]
}`;

// 生成 slug
function generateSlug(title: string): string {
  const pinyinMap: Record<string, string> = {
    '项目': 'xiang-mu',
    '概述': 'gai-shu',
    '快速': 'kuai-su',
    '开始': 'kai-shi',
    '环境': 'huan-jing',
    '配置': 'pei-zhi',
    '模型': 'mo-xing',
    '设置': 'she-zhi',
    '核心': 'he-xin',
    '功能': 'gong-neng',
    '高级': 'gao-ji',
    '特性': 'te-xing',
    '入门': 'ru-men',
    '指南': 'zhi-nan',
    '安装': 'an-zhuang',
    '使用': 'shi-yong',
    '教程': 'jiao-cheng',
  };

  const parts = title.split(' ').filter(Boolean);
  const slugParts = parts.map(p => pinyinMap[p] || p.toLowerCase());
  return slugParts.join('-');
}

// OutlineAgent
export async function runOutlineAgent(
  techStack: TechStackSummary,
  coreModules: CoreModules,
  manifest: FileManifest,
  config: AppConfig
): Promise<WikiPage[]> {
  logger.progress('OutlineAgent: 正在生成 Wiki 目录');

  const validPaths = manifest.files.slice(0, 100).map(f => f.path).join('\n');

  const prompt = USER_PROMPT_TEMPLATE
    .replace('{techStack}', JSON.stringify(techStack))
    .replace('{coreModules}', JSON.stringify(coreModules))
    .replace('{language}', config.language)
    .replace('{validPaths}', validPaths);

  const response = await callLLM(config, prompt, SYSTEM_PROMPT);
  const result = parseJsonResponse(response) as { pages: WikiPage[] };

  // 路径校验
  const validatedPages = validateOutput(result.pages, manifest);

  // 补充 slug（如果缺失）
  const finalPages = validatedPages.map((page, index) => ({
    ...page,
    slug: page.slug || `${index + 1}-${generateSlug(page.title)}`,
  }));

  logger.success('OutlineAgent: Wiki 目录生成完成');
  return finalPages;
}
```

- [ ] **Step 8: 创建 packages/agents/src/orchestrator.ts**

```typescript
import type { FileManifest, DehydratedSkeleton, WikiPage, AppConfig } from '@open-zread/types';
import { runScanAgent } from './scan-agent';
import { runClusterAgent } from './cluster-agent';
import { runOutlineAgent } from './outline-agent';
import { logger } from '@open-zread/utils';

interface AgentResult {
  techStack?: TechStackSummary;
  coreModules?: CoreModules;
  pages?: WikiPage[];
}

// 编排 Agent 执行
export async function runAgents(
  manifest: FileManifest,
  skeleton: DehydratedSkeleton,
  config: AppConfig
): Promise<WikiPage[]> {
  logger.progress('正在调用 Agent');

  // Step 1: ScanAgent
  const techStack = await runScanAgent(manifest, config);

  // Step 2: ClusterAgent
  const coreModules = await runClusterAgent(skeleton, techStack, config);

  // Step 3: OutlineAgent
  const pages = await runOutlineAgent(techStack, coreModules, manifest, config);

  return pages;
}

import type { TechStackSummary, CoreModules } from '@open-zread/types';
```

- [ ] **Step 9: 创建 packages/agents/src/index.ts**

```typescript
export * from './llm-client';
export * from './path-resolver';
export * from './scan-agent';
export * from './cluster-agent';
export * from './outline-agent';
export * from './orchestrator';
```

- [ ] **Step 10: 构建 agents package**

Run: `cd packages/agents && pnpm build`
Expected: 生成 dist 文件

---

### Task 10: 创建 packages/output 输出模块

**Files:**
- Create: `packages/output/package.json`
- Create: `packages/output/tsconfig.json`
- Create: `packages/output/src/constants.ts`
- Create: `packages/output/src/index.ts`

- [ ] **Step 1: 创建 packages/output/package.json**

```json
{
  "name": "@open-zread/output",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*",
    "@open-zread/config": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 packages/output/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 packages/output/src/constants.ts**

```typescript
export const OUTPUT_FILES = {
  wiki: 'wiki.json',
};

export const OUTPUT_DIRS = {
  drafts: 'drafts',
};
```

- [ ] **Step 4: 创建 packages/output/src/index.ts**

```typescript
import type { WikiOutput, WikiPage, AppConfig } from '@open-zread/types';
import { getDraftsDir, ensureDir, writeJsonFile, joinPath } from '@open-zread/utils';
import { OUTPUT_FILES } from './constants';
import { logger } from '@open-zread/utils';

// 生成 Wiki ID
function generateWikiId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `${dateStr}-${timeStr}`;
}

// 生成 wiki.json
export async function generateWikiJson(
  pages: WikiPage[],
  config: AppConfig
): Promise<string> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  const wikiOutput: WikiOutput = {
    id: generateWikiId(),
    generated_at: new Date().toISOString(),
    language: config.language,
    pages,
  };

  const outputPath = joinPath(draftsDir, OUTPUT_FILES.wiki);
  await writeJsonFile(outputPath, wikiOutput);

  logger.success(`蓝图已生成: ${outputPath}`);
  return outputPath;
}
```

- [ ] **Step 5: 构建 output package**

Run: `cd packages/output && pnpm build`
Expected: 生成 dist 文件

---

### Task 11: 创建 CLI 入口

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/src/index.ts`
- Create: `cli/src/ui.tsx`

- [ ] **Step 1: 创建 cli/package.json**

```json
{
  "name": "@open-zread/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "open-zread": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "bun run src/index.ts"
  },
  "dependencies": {
    "@open-zread/config": "workspace:*",
    "@open-zread/scanner": "workspace:*",
    "@open-zread/parser": "workspace:*",
    "@open-zread/dehydrator": "workspace:*",
    "@open-zread/cache": "workspace:*",
    "@open-zread/agents": "workspace:*",
    "@open-zread/output": "workspace:*",
    "@open-zread/utils": "workspace:*",
    "ink": "^4.0.0",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```

- [ ] **Step 2: 创建 cli/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 cli/src/ui.tsx**

```typescript
import React from 'react';
import { Box, Text } from 'ink';

interface ProgressProps {
  step: string;
  detail?: string;
}

export function Progress({ step, detail }: ProgressProps) {
  return (
    <Box>
      <Text color="cyan">🔄</Text>
      <Text> {step}</Text>
      {detail && <Text color="gray"> {detail}</Text>}
    </Box>
  );
}

interface SuccessProps {
  message: string;
}

export function Success({ message }: SuccessProps) {
  return (
    <Box>
      <Text color="green">✓</Text>
      <Text> {message}</Text>
    </Box>
  );
}

interface ErrorProps {
  message: string;
}

export function Error({ message }: ErrorProps) {
  return (
    <Box>
      <Text color="red">✗</Text>
      <Text> {message}</Text>
    </Box>
  );
}

interface ResultProps {
  outputPath: string;
}

export function Result({ outputPath }: ResultProps) {
  return (
    <Box flexDirection="column">
      <Text color="green">✅ 蓝图已生成</Text>
      <Text color="gray">  {outputPath}</Text>
    </Box>
  );
}
```

- [ ] **Step 4: 创建 cli/src/index.ts**

```typescript
#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { loadConfig } from '@open-zread/config';
import { scanFiles } from '@open-zread/scanner';
import { parseFiles } from '@open-zread/parser';
import { dehydrate } from '@open-zread/dehydrator';
import { loadCachedManifest, loadCachedSkeleton, saveCachedManifest, saveCachedSkeleton, needsReprocess } from '@open-zread/cache';
import { runAgents } from '@open-zread/agents';
import { generateWikiJson } from '@open-zread/output';
import { logger, getProjectRoot } from '@open-zread/utils';
import { Progress, Success, Error, Result } from './ui';

async function main() {
  try {
    // 加载配置
    const config = await loadConfig();
    const projectRoot = getProjectRoot();

    // 扫描文件
    const manifest = await scanFiles(projectRoot);

    if (manifest.totalFiles === 0) {
      render(<Error message="未找到可解析的源文件" />);
      return;
    }

    // 检查缓存
    const cachedManifest = await loadCachedManifest();
    const cachedSkeleton = await loadCachedSkeleton();

    let skeleton;

    if (!needsReprocess(cachedManifest, manifest) && cachedSkeleton) {
      render(<Success message="使用缓存，跳过解析" />);
      skeleton = cachedSkeleton;
    } else {
      // 解析文件
      const symbols = await parseFiles(manifest);

      // 脱水压缩
      skeleton = await dehydrate(symbols);

      // 保存缓存
      await saveCachedManifest(manifest);
      await saveCachedSkeleton(skeleton);
    }

    // 运行 Agent
    const pages = await runAgents(manifest, skeleton, config);

    // 生成输出
    const outputPath = await generateWikiJson(pages, config);

    render(<Result outputPath={outputPath} />);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    render(<Error message={message} />);
  }
}

main();
```

- [ ] **Step 5: 构建 CLI**

Run: `cd cli && pnpm build`
Expected: 生成 dist 文件

---

### Task 12: 安装依赖并验证构建

- [ ] **Step 1: 安装所有依赖**

Run: `pnpm install`
Expected: 安装所有 workspace 依赖

- [ ] **Step 2: 构建所有 packages**

Run: `pnpm run build:all`
Expected: 所有 packages 构建成功

- [ ] **Step 3: 测试 CLI 运行**

Run: `bun run cli/src/index.ts`
Expected: CLI 启动并显示进度（可能因配置文件缺失报错，正常）

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Scanner 模块 (Task 5)
- ✅ Parser Manager 模块 (Task 7)
- ✅ Dehydrator 模块 (Task 8)
- ✅ Cache 模块 (Task 6)
- ✅ Agents 模块 (Task 9)
- ✅ Output 模块 (Task 10)
- ✅ CLI 入口 (Task 11)
- ✅ 配置读取 (Task 3)
- ✅ 类型定义 (Task 2)
- ✅ 工具函数 (Task 4)

**2. Placeholder scan:**
- ✅ 无 TBD、TODO
- ✅ 无 "implement later"
- ✅ 所有代码步骤包含完整代码

**3. Type consistency:**
- ✅ FileManifest 在 types 和 scanner 中一致
- ✅ SymbolManifest 在 types 和 parser 中一致
- ✅ DehydratedSkeleton 在 types 和 dehydrator 中一致
- ✅ WikiPage 在 types 和 agents/output 中一致

---

**计划完成，已保存至 `docs/superpowers/plans/2026-04-10-open-zread-phase1-implementation.md`**

**执行选项：**

1. **Subagent-Driven（推荐）** - 每个任务派发独立 subagent，任务间 review

2. **Inline Execution** - 在当前会话中批量执行任务

选择哪种方式？