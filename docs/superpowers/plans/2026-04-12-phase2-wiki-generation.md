# Phase 2: Wiki 文档生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 读取 Phase 1 产出的 `.open-zread/drafts/wiki.json` 蓝图，通过 WriterManager 并发调度 WriterAgent 生成 20 篇高质量 Markdown 文档，写入 `.open-zread/wiki/current/`。

**Architecture:** 新增 `packages/writer`（WriterManager + WriterAgent + Prompts + ContextBuilder）和 `packages/storage`（WikiStore + Versioning）。修改 `packages/types` 增加 `type` 和 `skeletonHash` 字段。CLI 增加独立 `wiki` 命令。

**Tech Stack:** TypeScript, `@open-zread/agents` (LLM 调用), `p-limit` (并发控制), `ink` (CLI UI), 现有 monorepo 工具链 (tsup + turbo + pnpm)

---

## File Map

| 操作 | 文件 | 职责 |
|------|------|------|
| Create | `packages/types/src/index.ts` → 修改 | WikiPage 增加 `type`，CacheManifest 增加 `skeletonHash` |
| Create | `packages/writer/package.json` | 新包定义 |
| Create | `packages/writer/src/index.ts` | 导出入口 |
| Create | `packages/writer/src/prompts.ts` | Base Prompt + 5 个 Type Prompt 插件 |
| Create | `packages/writer/src/context-builder.ts` | 按页面类型预组装上下文 |
| Create | `packages/writer/src/writer-agent.ts` | 单页 LLM 调用 + Markdown 生成 |
| Create | `packages/writer/src/writer-manager.ts` | 并发调度、增量判定、进度报告 |
| Create | `packages/storage/package.json` | 新包定义 |
| Create | `packages/storage/src/index.ts` | 导出入口 |
| Create | `packages/storage/src/wiki-store.ts` | .md 读写、版本快照 |
| Create | `packages/storage/src/versioning.ts` | current → versions 迁移 |
| Modify | `packages/cache/src/index.ts` | saveCachedManifest 增加 skeletonHash 写入 |
| Modify | `packages/output/src/index.ts` | generateWikiJson 增加 techStackSummary 存储 |
| Modify | `cli/package.json` | 增加 @open-zread/writer 和 @open-zread/storage 依赖 |
| Modify | `cli/src/index.tsx` | 增加 `wiki` 子命令 |

---

### Task 1: 扩展类型定义 (WikiPage.type + CacheManifest.skeletonHash)

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: 修改 WikiPage 接口，增加 type 字段**

```typescript
// WikiPage - Wiki page definition
export interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  level: string;
  type?: 'overview' | 'architecture' | 'code' | 'spec' | 'reference'; // NEW
  associatedFiles?: string[];
}
```

- [ ] **Step 2: 修改 CacheManifest，增加 skeletonHash 字段**

```typescript
// CacheManifest - Cache manifest
export interface CacheManifest {
  version: string;
  generated_at: string;
  promptHash?: string; // NEW: 用于感知 Prompt 模板变更
  files: Array<{
    path: string;
    hash: string;
    skeletonHash?: string; // NEW: 骨架字符串的 MD5
    size: number;
  }>;
}
```

- [ ] **Step 3: 修改 WikiOutput，增加 techStackSummary 字段**

```typescript
// WikiOutput - Final output
export interface WikiOutput {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
  techStackSummary?: TechStackSummary; // NEW: 存储 Phase 1 的技术栈摘要
}
```


---

### Task 2: 创建 packages/writer 包骨架 + Prompts

**Files:**
- Create: `packages/writer/package.json`
- Create: `packages/writer/src/index.ts`
- Create: `packages/writer/src/prompts.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@open-zread/writer",
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
    "build": "tsup src/index.ts"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*",
    "@open-zread/agents": "workspace:*",
    "@open-zread/storage": "workspace:*",
    "p-limit": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.5.1",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 src/index.ts**

```typescript
export * from './writer-manager';
export * from './writer-agent';
```

- [ ] **Step 3: 创建 src/prompts.ts**

```typescript
import type { WikiPage } from '@open-zread/types';

export interface WriterPrompt {
  system: string;
  user: string;
}

// ── Base System Prompt (所有类型共享) ──────────────────────────
export const BASE_SYSTEM_PROMPT = `你是一个资深技术作家，正在为开源项目编写专业 Wiki 文档。

核心规则：
1. **代码块**：使用 \`\`\`typescript 等语法高亮代码块，展示核心函数/类定义
2. **Mermaid 图**：在描述模块关系、数据流时，必须使用 Mermaid classDiagram 或 graph 语法
3. **内链语法**：当提到其他 Wiki 页面中存在的模块名时，使用 [[Page Title]] 语法
4. **代码折叠**：如果代码片段超过 20 行，使用 <details><summary>描述</summary> 包裹
5. **术语保留**：技术术语保持英文原文（Middleware, Inversion of Control, Singleton 等），不强行翻译
6. **精准引用**：精准引用源码中的变量名、方法名、文件名，不编造不存在的符号
7. **避免废话**：不要写"总而言之"、"值得一提的是"等 AI 套话。直接陈述技术事实。
8. **语言**：使用 {doc_language} 编写，但技术术语保持英文。`;

// ── Type Prompt 插件 ─────────────────────────────────────────

export const TYPE_PROMPTS: Record<string, string> = {
  overview: `
当前页面类型：**概览型 (Overview)**
- 重点描述"为什么 (Why)"和"是什么 (What)"
- 使用叙述性语言，重点描述项目的业务价值和核心目标
- 少用或不用代码块，用段落文字和列表呈现
- 结构建议：项目愿景 → 核心特性 → 技术栈摘要 → 快速上手指引`,

  architecture: `
当前页面类型：**架构型 (Architecture)**
- 重点在于结构和数据流转
- **必须**包含至少一个 Mermaid 图（graph TD / classDiagram / sequenceDiagram）描述模块关系
- 重点描述数据如何从入口流向出口
- 结构建议：架构图 → 核心模块职责表 → 数据流解析 → 设计模式`,

  code: `
当前页面类型：**代码型 (Code-Intensive)**
- 深度技术文档，必须列出核心 Class 和 Function 的定义
- 解释关键参数的含义和返回值类型
- 提供源码中的精华片段，并解释其实现逻辑
- 结构建议：模块职责 → 核心符号表 → 关键代码解析 → 调用关系图 → 扩展阅读`,

  spec: `
当前页面类型：**规范型 (Specification)**
- 基于项目中的配置文件，总结编码规范和测试流程
- 使用任务列表 (Checklist) 的形式呈现规则
- 结构建议：规范概述 → 编码规则 Checklist → 目录约定 → 工具链配置`,

  reference: `
当前页面类型：**参考型 (Reference)**
- 将 API 接口或 CLI 命令整理成 **Markdown 表格**
- 包含参数名、类型、默认值和功能描述
- 结构建议：接口总表 → 参数详解 → 使用示例 → 错误码`,
};

// ── User Prompt 模板 ─────────────────────────────────────────

export function buildUserPrompt(
  page: WikiPage,
  context: string,
  techStackSummary: string
): string {
  const type = page.type || 'code';
  const typeHint = TYPE_PROMPTS[type] || TYPE_PROMPTS.code;

  return `## 页面信息
- 标题：${page.title}
- 章节：${page.section}
- 难度：${page.level}
- 类型：${type}
- 关联文件：${(page.associatedFiles || []).join(', ') || '无'}

## 项目技术栈摘要
${techStackSummary}

## 上下文代码
${context}

${typeHint}

请开始编写 "${page.title}" 页面。直接输出 Markdown 内容，不要有任何前缀说明。`;
}
```


---

### Task 3: 创建 ContextBuilder（上下文预组装）

**Files:**
- Create: `packages/writer/src/context-builder.ts`

- [ ] **Step 1: 创建 context-builder.ts**

```typescript
import type { WikiPage, DehydratedSkeleton } from '@open-zread/types';
import { readTextFile, getProjectRoot, joinPath } from '@open-zread/utils';
import { join } from 'path';

export interface BuildContextOptions {
  skeleton: DehydratedSkeleton;
  maxContextLength?: number; // 最大上下文字符数
}

// 根据页面类型和关联文件，从骨架中提取上下文
export function buildPageContext(
  page: WikiPage,
  options: BuildContextOptions
): string {
  const { skeleton, maxContextLength = 80000 } = options;
  const parts: string[] = [];

  // 构建文件路径 → 骨架内容的映射
  const skeletonMap = new Map(skeleton.map(s => [s.file, s.content]));

  if (page.associatedFiles && page.associatedFiles.length > 0) {
    parts.push(`## 关联文件骨架\n`);

    for (const filePath of page.associatedFiles) {
      const skeletonContent = skeletonMap.get(filePath);
      if (skeletonContent) {
        parts.push(`### 文件: ${filePath}\n`);
        parts.push(`\`\`\`\n${skeletonContent}\n\`\`\`\n`);
      } else {
        // 骨架中没有，尝试直接读取源文件
        const projectRoot = getProjectRoot();
        const fullPath = join(projectRoot, filePath);
        parts.push(`### 文件: ${filePath} (直接读取)\n`);
        parts.push(`\`\`\`\n${tryReadSourceFileSync(fullPath)}\n\`\`\`\n`);
      }
    }
  }

  // 按类型控制上下文长度
  let context = parts.join('\n');
  if (context.length > maxContextLength) {
    context = context.slice(0, maxContextLength) + '\n\n...(上下文已截断)';
  }

  return context;
}

function tryReadSourceFileSync(path: string): string {
  try {
    return readTextFile(path);
  } catch {
    return `(文件读取失败: ${path})`;
  }
}
```

> **注意**：`readTextFile` 是 async 的，但这里我们需要同步读取来保持 `buildPageContext` 简洁。需要修改为 async 或使用 `fs.readFileSync`。修正为 async 版本：

```typescript
import type { WikiPage, DehydratedSkeleton } from '@open-zread/types';
import { getProjectRoot } from '@open-zread/utils';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface BuildContextOptions {
  skeleton: DehydratedSkeleton;
  maxContextLength?: number;
}

export async function buildPageContext(
  page: WikiPage,
  options: BuildContextOptions
): Promise<string> {
  const { skeleton, maxContextLength = 80000 } = options;
  const parts: string[] = [];
  const skeletonMap = new Map(skeleton.map(s => [s.file, s.content]));

  if (page.associatedFiles && page.associatedFiles.length > 0) {
    parts.push(`## 关联文件骨架\n`);

    for (const filePath of page.associatedFiles) {
      const skeletonContent = skeletonMap.get(filePath);
      if (skeletonContent) {
        parts.push(`### 文件: ${filePath}\n`);
        parts.push(`\`\`\`\n${skeletonContent}\n\`\`\`\n`);
      } else {
        const projectRoot = getProjectRoot();
        const fullPath = join(projectRoot, filePath);
        parts.push(`### 文件: ${filePath} (直接读取)\n`);
        try {
          const source = readFileSync(fullPath, 'utf-8');
          parts.push(`\`\`\`\n${source.slice(0, 5000)}\n\`\`\`\n`);
        } catch {
          parts.push(`\n(文件读取失败: ${filePath})\n`);
        }
      }
    }
  }

  let context = parts.join('\n');
  if (context.length > maxContextLength) {
    context = context.slice(0, maxContextLength) + '\n\n...(上下文已截断)';
  }

  return context;
}
```


---

### Task 4: 创建 WriterAgent（单页 LLM 调用）

**Files:**
- Create: `packages/writer/src/writer-agent.ts`

- [ ] **Step 1: 创建 writer-agent.ts**

```typescript
import type { AppConfig, WikiPage, DehydratedSkeleton, TechStackSummary } from '@open-zread/types';
import { callLLM } from '@open-zread/agents';
import { BASE_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import { buildPageContext } from './context-builder';
import { logger } from '@open-zread/utils';

export interface WritePageOptions {
  page: WikiPage;
  config: AppConfig;
  skeleton: DehydratedSkeleton;
  techStackSummary: TechStackSummary;
}

export async function writePage(options: WritePageOptions): Promise<string> {
  const { page, config, skeleton, techStackSummary } = options;

  logger.info(`Writing page: ${page.title}`);

  // Build context
  const context = await buildPageContext(page, { skeleton });

  // Build prompts
  const systemPrompt = BASE_SYSTEM_PROMPT.replace('{doc_language}', config.doc_language || 'zh');
  const techStackStr = techStackSummary
    ? JSON.stringify(techStackSummary, null, 2)
    : '(未知)';
  const userPrompt = buildUserPrompt(page, context, techStackStr);

  // Call LLM with retry
  const maxRetries = config.concurrency.max_retries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callLLM(config, userPrompt, systemPrompt);
      logger.success(`Page "${page.title}" generated (${response.length} chars)`);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(`Page "${page.title}" attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to generate page: ${page.title}`);
}
```


---

### Task 5: 创建 WriterManager（并发调度 + 增量判定）

**Files:**
- Create: `packages/writer/src/writer-manager.ts`

- [ ] **Step 1: 创建 writer-manager.ts**

```typescript
import type { AppConfig, WikiPage, DehydratedSkeleton, TechStackSummary, CacheManifest } from '@open-zread/types';
import { writePage } from './writer-agent';
import { WikiStore } from '@open-zread/storage';
import { logger, getProjectRoot } from '@open-zread/utils';
import { join } from 'path';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { BASE_SYSTEM_PROMPT, TYPE_PROMPTS } from './prompts';

export interface WriterManagerOptions {
  pages: WikiPage[];
  config: AppConfig;
  skeleton: DehydratedSkeleton;
  techStackSummary: TechStackSummary;
  lastManifest: CacheManifest | null;
  force: boolean;
}

export interface PageResult {
  page: WikiPage;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  outputPath?: string;
}

// 计算骨架 Hash
function computeSkeletonHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

// 判断页面是否需要重写（增量更新逻辑）
function shouldRewritePage(
  page: WikiPage,
  lastManifest: CacheManifest | null,
  currentSkeleton: DehydratedSkeleton
): boolean {
  if (!lastManifest) return true;
  if (!page.associatedFiles || page.associatedFiles.length === 0) return true;

  const skeletonMap = new Map(currentSkeleton.skeleton.map(s => [s.file, s.content]));

  return page.associatedFiles.some(filePath => {
    const lastFile = lastManifest.files.find(f => f.path === filePath);
    if (!lastFile) return true; // 新文件

    // 有 skeletonHash 则比对骨架
    if (lastFile.skeletonHash) {
      const currentContent = skeletonMap.get(filePath);
      if (!currentContent) return true;
      const currentSkeletonHash = computeSkeletonHash(currentContent);
      return currentSkeletonHash !== lastFile.skeletonHash;
    }

    // 回退到文件 Hash 比对
    return true;
  });
}

// 计算 Prompt 模板的 Hash（用于检测 Prompt 变更）
function computePromptHash(): string {
  const allPrompts = BASE_SYSTEM_PROMPT + JSON.stringify(TYPE_PROMPTS);
  return createHash('md5').update(allPrompts).digest('hex');
}

export async function runWriterManager(
  options: WriterManagerOptions
): Promise<PageResult[]> {
  const { pages, config, skeleton, techStackSummary, lastManifest, force } = options;
  const store = new WikiStore();
  const results: PageResult[] = [];
  const maxConcurrent = config.concurrency.max_concurrent || 4;

  // 判断 Prompt 是否变更
  const currentPromptHash = computePromptHash();
  const promptChanged = lastManifest?.promptHash !== currentPromptHash;

  // 分类页面
  const pagesToWrite: WikiPage[] = [];
  const pagesToSkip: WikiPage[] = [];

  for (const page of pages) {
    if (force || promptChanged) {
      pagesToWrite.push(page);
    } else if (shouldRewritePage(page, lastManifest, skeleton)) {
      pagesToWrite.push(page);
    } else {
      pagesToSkip.push(page);
      results.push({ page, status: 'skipped', reason: '骨架未变更' });
    }
  }

  // 并发写入 (使用 p-limit)
  const limit = pLimit(maxConcurrent);

  const writeTasks = pagesToWrite.map((page, index) =>
    limit(async () => {
      logger.info(`[${index + 1}/${pages.length}] 正在生成: ${page.title}...`);
      try {
        const content = await writePage({ page, config, skeleton, techStackSummary });
        const outputPath = await store.writePage(page, content);
        results.push({ page, status: 'success', outputPath });
        logger.success(`[✓] ${page.file}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push({ page, status: 'failed', reason: errMsg });
        logger.error(`[✗] ${page.file} - ${errMsg}`);
      }
    })
  );

  await Promise.all(writeTasks);

  // 输出跳过信息
  for (const page of pagesToSkip) {
    logger.info(`[⊘] ${page.file} (跳过，骨架未变)`);
  }

  // 版本快照
  await store.createSnapshot();

  // 摘要
  const successCount = results.filter(r => r.status === 'success').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  logger.info(`\n生成完成: ${successCount} 成功, ${skippedCount} 跳过, ${failedCount} 失败`);

  return results;
}
```


---

### Task 6: 创建 packages/storage 包

**Files:**
- Create: `packages/storage/package.json`
- Create: `packages/storage/src/index.ts`
- Create: `packages/storage/src/wiki-store.ts`
- Create: `packages/storage/src/versioning.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@open-zread/storage",
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
    "build": "tsup src/index.ts"
  },
  "dependencies": {
    "@open-zread/types": "workspace:*",
    "@open-zread/utils": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.5.1",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: 创建 src/index.ts**

```typescript
export * from './wiki-store';
export * from './versioning';
```

- [ ] **Step 3: 创建 src/versioning.ts**

```typescript
import { getProjectRoot, joinPath, ensureDir, readTextFile, writeTextFile } from '@open-zread/utils';
import { existsSync, readdirSync, statSync, renameSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const WIKI_DIR = '.open-zread/wiki';
const CURRENT_DIR = joinPath(WIKI_DIR, 'current');
const VERSIONS_DIR = joinPath(WIKI_DIR, 'versions');

// 生成快照名称: YYYY-MM-DD_HHmm_commitHash
export function generateSnapshotName(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16).replace(':', '');

  let commitHash = '';
  try {
    const projectRoot = getProjectRoot();
    commitHash = execSync('git rev-parse --short HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
  } catch {
    commitHash = 'unknown';
  }

  return `${dateStr}_${timeStr}_${commitHash}`;
}

// 创建版本快照
export async function createVersionSnapshot(): Promise<string> {
  const currentPath = join(getProjectRoot(), CURRENT_DIR);
  if (!existsSync(currentPath)) {
    return ''; // 无当前内容，跳过快照
  }

  const snapshotName = generateSnapshotName();
  const versionsPath = join(getProjectRoot(), VERSIONS_DIR);
  const snapshotPath = join(versionsPath, snapshotName);

  await ensureDir(versionsPath);

  // 复制 current 到 versions/<snapshot>/
  copyDirRecursive(currentPath, snapshotPath);

  return snapshotName;
}

function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      const content = readTextFile(srcPath);
      writeTextFile(destPath, content);
    }
  }
}
```

- [ ] **Step 4: 创建 src/wiki-store.ts**

```typescript
import type { WikiPage } from '@open-zread/types';
import { getProjectRoot, joinPath, ensureDir, writeTextFile } from '@open-zread/utils';
import { existsSync, readdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { createVersionSnapshot } from './versioning';

const WIKI_DIR = '.open-zread/wiki';
const CURRENT_DIR = joinPath(WIKI_DIR, 'current');

export class WikiStore {
  private currentDir: string;

  constructor() {
    this.currentDir = join(getProjectRoot(), CURRENT_DIR);
  }

  // 写入单页 Markdown
  async writePage(page: WikiPage, content: string): Promise<string> {
    const filePath = join(this.currentDir, page.file);
    await ensureDir(dirname(filePath)); // 确保父目录存在（处理 core/auth-service.md 等深层路径）
    await writeTextFile(filePath, content);
    return filePath;
  }

  // 读取单页
  async readPage(page: WikiPage): Promise<string | null> {
    const { readTextFile } = await import('@open-zread/utils');
    const filePath = join(this.currentDir, page.file);
    try {
      return await readTextFile(filePath);
    } catch {
      return null;
    }
  }

  // 创建版本快照（在写入完成后调用）
  async createSnapshot(): Promise<string> {
    return createVersionSnapshot();
  }
}
```


---

### Task 7: 修改 Cache 输出 skeletonHash

**Files:**
- Modify: `packages/cache/src/index.ts`

- [ ] **Step 1: 修改 cache/src/index.ts，新增 saveCachedManifestWithSkeleton**

```typescript
// 新增：保存骨架 Hash 到 manifest
export async function saveCachedManifestWithSkeleton(
  manifest: FileManifest,
  skeleton: DehydratedSkeleton
): Promise<void> {
  const cacheDir = getCacheDir();
  await ensureDir(cacheDir);

  const skeletonMap = new Map(skeleton.skeleton.map(s => [s.file, s.content]));

  const cacheManifest: CacheManifest = {
    version: CACHE_VERSION,
    generated_at: new Date().toISOString(),
    files: manifest.files.map(f => ({
      path: f.path,
      hash: f.hash,
      skeletonHash: skeletonMap.has(f.path)
        ? createHash('md5').update(skeletonMap.get(f.path)!).digest('hex')
        : undefined,
      size: f.size,
    })),
  };

  const manifestPath = join(cacheDir, CACHE_FILES.manifest);
  await writeJsonFile(manifestPath, cacheManifest);
}
```

需要在 `packages/cache/src/index.ts` 顶部添加：
```typescript
import { createHash } from 'crypto';
```


---

### Task 8: CLI 增加 `wiki` 子命令

**Files:**
- Modify: `cli/package.json`
- Modify: `cli/src/index.tsx`
- Modify: `packages/output/src/index.ts`

- [ ] **Step 1: 修改 packages/output/src/index.ts，存储 techStackSummary**

修改 `generateWikiJson` 函数签名和实现：

```typescript
import type { WikiOutput, WikiPage, AppConfig, TechStackSummary } from '@open-zread/types';

export async function generateWikiJson(
  pages: WikiPage[],
  config: AppConfig,
  techStackSummary?: TechStackSummary  // NEW parameter
): Promise<string> {
  const draftsDir = getDraftsDir();
  await ensureDir(draftsDir);

  const wikiOutput: WikiOutput = {
    id: generateWikiId(),
    generated_at: new Date().toISOString(),
    language: config.language,
    pages,
    techStackSummary,  // NEW: store in wiki.json
  };

  const outputPath = joinPath(draftsDir, OUTPUT_FILES.wiki);
  await writeJsonFile(outputPath, wikiOutput);

  logger.success(`Blueprint generated: ${outputPath}`);
  return outputPath;
}
```

- [ ] **Step 2: 修改 cli/package.json，增加依赖**

在 dependencies 中添加：
```json
"@open-zread/writer": "workspace:*",
"@open-zread/storage": "workspace:*"
```

- [ ] **Step 3: 修改 cli/src/index.tsx，增加 wiki 子命令**

读取现有 `cli/src/index.tsx`，当前的 main() 函数是 Phase 1 的入口。我们需要解析命令行参数来区分 Phase 1 和 Phase 2：

```tsx
#!/usr/bin/env bun
import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { loadConfig } from '@open-zread/config';
import { scanFiles } from '@open-zread/scanner';
import { parseFiles } from '@open-zread/parser';
import { dehydrate } from '@open-zread/dehydrator';
import { loadCachedManifest, loadCachedSkeleton, saveCachedManifest, saveCachedSkeleton, needsReprocess } from '@open-zread/cache';
import { runAgents } from '@open-zread/agents';
import { runScanAgent } from '@open-zread/agents';
import { generateWikiJson } from '@open-zread/output';
import { getProjectRoot } from '@open-zread/utils';
import { readJsonFile } from '@open-zread/utils';
import { join } from 'path';
import { runWriterManager, PageResult } from '@open-zread/writer';
import type { WikiOutput, DehydratedSkeleton, TechStackSummary, CacheManifest } from '@open-zread/types';

// ... (App 组件和 stateListeners 保持不变) ...

async function runWikiCommand() {
  const { waitUntilExit } = render(<App initialState={{ step: 'Loading wiki blueprint...', status: 'running' }} />);

  try {
    progress.start('Loading config...');
    const config = await loadConfig();

    progress.start('Loading wiki.json blueprint...');
    const projectRoot = getProjectRoot();
    const wikiJsonPath = join(projectRoot, '.open-zread', 'drafts', 'wiki.json');
    const wikiOutput = await readJsonFile<WikiOutput>(wikiJsonPath);

    progress.start('Loading cached skeleton...');
    const skeleton = await loadCachedSkeleton();
    if (!skeleton) {
      progress.error('No cached skeleton found. Run Phase 1 first.');
      await waitUntilExit();
      return;
    }

    // 从 wiki.json 中读取 Phase 1 生成的技术栈摘要
    const techStackSummary: TechStackSummary = wikiOutput.techStackSummary || {
      techStack: { languages: [], frameworks: [], buildTools: [] },
      projectType: 'unknown',
      entryPoints: [],
    };

    progress.start('Loading cache manifest...');
    const lastManifest = await loadCachedManifest();

    const force = process.argv.includes('--force');

    progress.start('Generating wiki pages...', `${wikiOutput.pages.length} pages, concurrency: ${config.concurrency.max_concurrent}`);

    const results = await runWriterManager({
      pages: wikiOutput.pages,
      config,
      skeleton,
      techStackSummary,
      lastManifest,
      force,
    });

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    if (failedCount > 0) {
      progress.error(`${failedCount} page(s) failed`);
    } else {
      progress.success(`Wiki generated: ${successCount}/${wikiOutput.pages.length} pages`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    progress.error(message);
  }

  await waitUntilExit();
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'wiki') {
    await runWikiCommand();
  } else {
    // Phase 1: original flow
    await runPhase1();
  }
}

async function runPhase1() {
  const { waitUntilExit } = render(<App initialState={{ step: 'Initializing...', status: 'running' }} />);

  try {
    progress.start('Loading config...');
    const config = await loadConfig();
    const projectRoot = getProjectRoot();

    // ... (scan, parse, dehydrate, agents - 原有逻辑不变) ...

    // Step 1: ScanAgent
    const techStack = await runScanAgent(manifest, config);

    // ... (cluster, dehydrate 等) ...

    progress.start('Generating wiki.json...', `${pages.length} pages`);
    const outputPath = await generateWikiJson(pages, config, techStack); // NEW: 传入 techStack

    progress.success(outputPath);
  } catch (error) {
    // ... 原有错误处理 ...
  }

  await waitUntilExit();
}

main();
```

为了不让 `runPhase1` 重复 App 组件，需要将原来的 main() 逻辑提取为 `runPhase1()` 函数。


---

### Task 9: 安装 workspace 依赖 + 构建验证

**Files:**
- No file changes

- [ ] **Step 1: 安装依赖**

```bash
pnpm install
```

- [ ] **Step 2: 构建所有新包**

```bash
pnpm run build
```

- [ ] **Step 3: 验证 wiki 命令可用**

```bash
bun run cli/src/index.tsx wiki --help
```

---

### Task 10: 类型一致性自检 + Spec 覆盖检查

- [ ] **Step 1: 检查 spec 覆盖**

对照 `docs/superpowers/specs/2026-04-12-phase2-wiki-generation-design.md` 逐项检查：

| Spec 需求 | 实现 Task | 状态 |
|-----------|----------|------|
| WikiPage.type 字段 | Task 1 | ✓ |
| CacheManifest.skeletonHash | Task 1, 7 (cache层计算) | ✓ |
| 5 种类型 Prompt 插件 | Task 2 | ✓ |
| ContextBuilder 预组装 | Task 3 | ✓ |
| WriterAgent LLM 调用 | Task 4 | ✓ |
| WriterManager 并发调度 | Task 5 | ✓ |
| WikiStore + Versioning | Task 6 | ✓ |
| 增量更新判定 | Task 5 (shouldRewritePage) | ✓ |
| --force 参数 | Task 5 | ✓ |
| 简洁行式进度 | Task 5 (logger) | ✓ |
| 快照命名 YYYY-MM-DD_HHmm_commitHash | Task 6 (versioning.ts) | ✓ |
| open-zread wiki 命令 | Task 8 | ✓ |
| config.yaml max_concurrent | Task 5 (读取 config) | ✓ |
| config.yaml max_retries | Task 4 (WriterAgent 重试) | ✓ |
| techStackSummary 传入 WriterManager | Task 1 (types), Task 8 (output 存储) | ✓ |

- [ ] **Step 2: 类型一致性检查**

确认所有文件中使用的类型名、函数名一致：
- `buildPageContext` 在 Task 3 和 Task 4 中签名一致
- `writePage` 在 Task 4 和 Task 5 中调用方式一致
- `WikiStore.writePage` 和 `WikiStore.createSnapshot` 在 Task 5 和 Task 6 中使用一致


---

## 依赖关系

```
Task 1 (types) ──────────────────→ Task 2, 3, 4, 5, 6, 7
Task 2 (prompts) ────────────────→ Task 3, 4
Task 3 (context-builder) ────────→ Task 4
Task 4 (writer-agent) ───────────→ Task 5
Task 6 (storage) ────────────────→ Task 5
Task 7 (cache skeletonHash) ─────→ Task 5
Task 5 (writer-manager) ─────────→ Task 8 (cli wiki)
Task 8 (output techStackSummary) ─→ Phase 1 CLI (runAgents 调用处)
Task 8 ──────────────────────────→ Task 9 (build)
Task 9 ──────────────────────────→ Task 10 (self-review)
```

建议执行顺序：Task 1 → Task 2 → Task 6 → Task 7（可并行）→ Task 3 → Task 4 → Task 5 → Task 8 → Task 9 → Task 10
