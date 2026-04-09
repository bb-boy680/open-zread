# Open-Zread 第一阶段设计文档

## 项目概述

复刻 zread-cli 第一阶段：项目扫描与蓝图构建 CLI 工具。目标：处理 50w+ 行代码项目，输出 wiki.json 蓝图。

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                   CLI Entry (Ink + Bun)                      │
│                   open-zread (无参数，当前目录)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Scanner     │  │ Parser      │  │ Dehydrator          │ │
│  │ (Worker)    │  │ Manager     │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│       │                  │                    │            │
│       ▼                  ▼                    ▼            │
│  [文件列表+Hash]    [AST 符号]           [骨架代码]         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Agent Layer (PI-SDK)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ ScanAgent   │→ │ ClusterAgent│→ │ OutlineAgent        │ │
│  │             │  │             │  │                     │ │
│  │ 汇总技术栈  │  │ 标记核心模块│  │ 生成 Wiki 目录      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Output: wiki.json                         │
│                .open-zread/drafts/wiki.json                  │
└─────────────────────────────────────────────────────────────┘
```

**使用方式：**
```bash
cd /path/to/your/project
open-zread
# 输出: .open-zread/drafts/wiki.json
```

## 2. 核心模块职责

| 模块 | 输入 | 输出 | 技术 |
|------|------|------|------|
| Scanner | 文件系统路径 | 文件列表 + Hash | Worker Threads, `ignore` |
| Parser Manager | 文件内容 | AST 符号 | web-tree-sitter (WASM 懒加载) |
| Dehydrator | AST + 源码 | 骨架代码（导出、签名、依赖） | SCM Queries |
| ScanAgent | 文件列表 | 技术栈摘要 | PI-SDK + LLM |
| ClusterAgent | 骨架 + 引用图 | 核心模块标记 | PI-SDK + LLM |
| OutlineAgent | 骨架 + 核心模块 | Wiki pages 数组 | PI-SDK + LLM |

## 3. Scanner 模块设计

**职责：** 高效遍历文件系统，生成文件清单 + Hash

**核心技术：**
- Worker Threads — 主线程不阻塞，IO 密集型任务并行化
- `ignore` 库 — 解析 `.gitignore`，过滤 node_modules 等噪音
- Hash 计算 — 多线程并行计算文件 Hash

**输入输出：**

```typescript
// 输入: 当前工作目录 (process.cwd())

// 输出: FileManifest
interface FileManifest {
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
```

**Scanner 常量配置（代码内写死）：**

```typescript
// packages/scanner/src/constants.ts
export const SCANNER_CONFIG = {
  max_workers: 4,
  max_file_size: 1024 * 1024,  // 1MB
  ignore_patterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '*.test.ts',
    '*.spec.js',
    '*.min.js'
  ]
};
```

## 4. Parser Manager 模块设计

**职责：** 使用 Tree-sitter WASM 按需解析文件，提取 AST 符号

**核心技术：**
- web-tree-sitter — WASM 版 Tree-sitter，支持懒加载
- 语言检测 — 根据文件后缀名自动选择解析器
- 懒加载策略 — `.wasm` 语法包按需下载并缓存至 `~/.zread/parsers/`

**支持的语言解析器：**

| 后缀名 | 解析器 | 提取重点 |
|--------|--------|----------|
| `.ts/.tsx` | tree-sitter-tsx | FunctionComponent, Props Interface, Hooks |
| `.js/.jsx` | tree-sitter-javascript | 函数声明、导出 |
| `.vue` | tree-sitter-vue + tree-sitter-typescript | 二级解析：提取 script 块内容 |
| `.go` | tree-sitter-go | 函数、结构体、接口 |
| `.py` | tree-sitter-python | 函数、类、导入 |

**Vue SFC 特殊处理：**
1. tree-sitter-vue 定位 `<script>` 块
2. 对 script 内容二次解析（TS/JS）
3. 提取 defineProps, defineEmits, setup 逻辑
4. 忽略 `<template>` 和 `<style>` 内部结构

**输入输出：**

```typescript
// 输入: FileManifest

// 输出: SymbolManifest
interface SymbolManifest {
  symbols: Array<{
    file: string;
    exports: string[];
    functions: Array<{ name: string; signature: string }>;
    imports: string[];
    docstrings: string[];
  }>;
  loadedParsers: string[];
}
```

## 5. Dehydrator 模块设计

**职责：** 压缩代码为骨架，保留架构信息，去除实现细节

**提取项（保留）：**
- 导出符号
- 类与函数签名
- 顶部文档注释
- 模块依赖

**剔除项（去除）：**
- 函数体内部逻辑
- 循环/分支语句
- 局部变量声明
- HTML 标签细节（Vue template）
- CSS 样式规则

**输入输出：**

```typescript
// 输入: SymbolManifest + 原始源码

// 输出: DehydratedSkeleton
interface DehydratedSkeleton {
  skeleton: Array<{
    file: string;
    content: string;
  }>;
  referenceMap: Record<string, number>;  // 文件引用次数统计
}
```

**referenceMap 示例：**

```json
{
  "referenceMap": {
    "src/auth/login.ts": 50,
    "src/api/client.ts": 32,
    "src/utils/helper.ts": 15,
    "src/components/Button.tsx": 8
  }
}
```

**作用：** 显式告诉 ClusterAgent 文件权重，提高蓝图聚类准确性。

**Dehydrator 常量配置（代码内写死）：**

```typescript
// packages/dehydrator/src/constants.ts
export const DEHYDRATOR_CONFIG = {
  max_file_lines: 10000,       // 单文件行数上限（触发截断）
  header_lines_limit: 500      // 大文件截断时保留的行数
};
```

## 6. Agent Layer 设计（PI-SDK 编排）

**编排顺序：**

```
ScanAgent → ClusterAgent → OutlineAgent
    │           │              │
    ▼           ▼              ▼
技术栈摘要   核心模块标记    Wiki pages 数组
```

### 6.1 ScanAgent

**职责：** 分析文件清单，识别技术栈和项目类型

**输入：** FileManifest

**输出：**
```typescript
interface TechStackSummary {
  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
  };
  projectType: string;
  entryPoints: string[];
}
```

### 6.2 ClusterAgent

**职责：** 分析骨架代码和引用关系，标记核心模块

**输入：** DehydratedSkeleton（包含 referenceMap） + TechStackSummary

**输出：**
```typescript
interface CoreModules {
  coreModules: Array<{
    name: string;
    files: string[];
    reason: string;  // 例如："高频引用（50 次）"
  }>;
  moduleGroups: Record<string, string[]>;
}
```

**核心模块判断依据：**
- referenceMap 中引用次数 ≥ 20 的文件
- 入口文件（index.ts, main.ts）
- 配置文件（config.ts, settings.ts）

### 6.3 OutlineAgent

**职责：** 生成 Wiki 目录结构

**输入：** TechStackSummary + CoreModules + language 配置 + FileManifest（用于路径校验）

**输出：** Wiki pages 数组

**路径校验（Path Resolver）：**

```typescript
interface OutlineAgentOutput {
  pages: Array<{
    slug: string;
    title: string;
    file: string;
    section: string;
    level: string;
    associatedFiles?: string[];  // AI 可能生成的关联文件路径（可选）
  }>;
}

// 输出校验流程
function validateOutput(output: OutlineAgentOutput, manifest: FileManifest): OutlineAgentOutput {
  return {
    pages: output.pages.map(page => {
      if (!page.associatedFiles) return page;

      // 校验每个关联文件路径
      const validatedFiles = page.associatedFiles.filter(filePath => {
        // 1. 精确匹配
        if (manifest.files.some(f => f.path === filePath)) return true;

        // 2. 模糊匹配（尝试修正拼写错误）
        const normalizedPath = filePath.replace(/[/\\]/g, '/');
        const match = manifest.files.find(f =>
          f.path.replace(/[/\\]/g, '/') === normalizedPath
        );
        if (match) {
          // 自动修正路径
          filePath = match.path;
          return true;
        }

        // 3. 无法匹配，剔除该路径
        console.warn(`Path Resolver: 文件路径不存在，已剔除: ${filePath}`);
        return false;
      });

      return { ...page, associatedFiles: validatedFiles };
    })
  };
}
```

**Prompt 容错策略：**

```
Prompt 中明确告知 AI：
"生成的文件路径必须在以下清单中选取，不要创造不存在的路径："
+ FileManifest 文件列表摘要
```

**校验时机：** OutlineAgent 输出后，立即运行 validateOutput，剔除幻觉路径。

## 7. 配置设计

**配置文件格式：`~/.zread/config.yaml`**

```yaml
language: zh
doc_language: zh
llm:
  provider: custom
  model: glm-5
  api_key: sk-sp-xxx
  base_url: https://coding.dashscope.aliyuncs.com/v1
concurrency:
  max_concurrent: 3
  max_retries: 3
```

**配置读取模块（聚合）：**

```typescript
// packages/config/src/index.ts
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

export function loadConfig(): AppConfig {
  const configPath = path.join(os.homedir(), '.zread', 'config.yaml');
  const rawConfig = yaml.parse(fs.readFileSync(configPath, 'utf-8'));
  return validateConfig(rawConfig);
}
```

## 9. 状态持久化与缓存

**目录结构：**

```
.open-zread/
├── drafts/
│   └── wiki.json              # 第一阶段蓝图输出
├── cache/
│   ├── last_manifest.json     # 上次扫描的文件清单 + Hash
│   └── last_skeleton.json     # 上次生成的骨架代码
└── parsers/                   # WASM 解析器缓存（可选，或统一放 ~/.zread/parsers/）
```

**增量扫描逻辑：**

```typescript
// 第二次运行时检查缓存
const lastManifest = loadCache('.open-zread/cache/last_manifest.json');
const currentManifest = scanFiles();

// 对比 Hash，找出变化的文件
const changedFiles = diffManifests(lastManifest, currentManifest);

if (changedFiles.length === 0) {
  // 无变化，直接加载缓存骨架
  skeleton = loadCache('.open-zread/cache/last_skeleton.json');
  // 跳过 Parser 和 Dehydrator
} else {
  // 仅处理变化的文件
  symbols = parseFiles(changedFiles);
  skeleton = dehydrate(symbols);
  // 更新缓存
  saveCache('last_manifest.json', currentManifest);
  saveCache('last_skeleton.json', skeleton);
}
```

**last_manifest.json 格式：**

```json
{
  "version": "1.0",
  "generated_at": "2026-04-10T00:12:34.567Z",
  "files": [
    { "path": "src/index.ts", "hash": "a1b2c3...", "size": 1024 },
    { "path": "src/app.tsx", "hash": "d4e5f6...", "size": 2048 }
  ]
}
```

**作用：** 50w 行项目第二次运行时，若无代码变化，可直接跳过 Parser/Dehydrator，瞬间进入 Agent 环节。

## 10. WASM 解析器管理

**下载源：**

```
默认源: https://unpkg.com/tree-sitter-artifacts@latest/languages/
备用源: ~/.zread/parsers/ (本地缓存)
```

**解析器文件命名：**

```
tree-sitter-tsx.wasm
tree-sitter-typescript.wasm
tree-sitter-vue.wasm
tree-sitter-go.wasm
tree-sitter-python.wasm
tree-sitter-javascript.wasm
```

**WASM 加载逻辑：**

```typescript
async function loadParser(language: string): Promise<Parser {
  const wasmFile = `tree-sitter-${language}.wasm`;
  const localPath = path.join(os.homedir(), '.zread', 'parsers', wasmFile);

  // 1. 检查本地缓存
  if (fs.existsSync(localPath)) {
    return Parser.loadWasm(localPath);
  }

  // 2. 从 CDN 下载
  const cdnUrl = `https://unpkg.com/tree-sitter-artifacts@latest/languages/${wasmFile}`;

  try {
    const response = await fetch(cdnUrl, { timeout: 10000 });
    const wasmBuffer = await response.arrayBuffer();

    // 3. 保存到本地缓存
    fs.writeFileSync(localPath, Buffer.from(wasmBuffer));

    return Parser.loadWasm(localPath);
  } catch (error) {
    // 网络失败，进入离线模式
    throw new Error(`无法加载 ${language} 解析器，请检查网络连接或手动下载 WASM 文件至 ~/.zread/parsers/`);
  }
}
```

**离线模式：**

- 如果本地缓存存在，优先使用，不强制联网
- 如果本地不存在且网络失败，提示用户手动下载

## 11. 输出数据模型

**输出文件：`.open-zread/drafts/wiki.json`**

```json
{
  "id": "2026-04-10-001234",
  "generated_at": "2026-04-10T00:12:34.567Z",
  "language": "zh",
  "pages": [
    {
      "slug": "1-xiang-mu-gai-shu",
      "title": "项目概述",
      "file": "1-xiang-mu-gai-shu.md",
      "section": "入门指南",
      "level": "Beginner"
    }
  ]
}
```

**字段说明：**

| 字段 | 来源 | 说明 |
|------|------|------|
| `id` | 时间戳生成 | 蓝图唯一标识 |
| `generated_at` | 系统时间 | 生成时间戳 |
| `language` | config.yaml | 输出语言 |
| `pages` | OutlineAgent | Wiki 章节列表 |

## 12. 项目目录结构

```
open-zread/
├── cli/
│   ├── src/
│   │   ├── index.ts              # CLI 入口
│   │   └── ui.tsx                # Ink UI 组件
│   └ package.json
│
├── packages/
│   ├── config/
│   │   ├── src/
│   │   │   └── index.ts          # 配置聚合加载
│   │   └ package.json
│   │
│   ├── scanner/
│   │   ├── src/
│   │   │   ├── index.ts          # Scanner SDK
│   │   │   ├── worker.ts         # Worker Thread 实现
│   │   │   └── constants.ts      # Scanner 常量
│   │   └ package.json
│   │
│   ├── parser/
│   │   ├── src/
│   │   │   ├── index.ts          # Parser Manager SDK
│   │   │   ├── wasm-loader.ts    # WASM 懒加载
│   │   │   └── vue-handler.ts    # Vue SFC 特殊处理
│   │   └ package.json
│   │
│   ├── dehydrator/
│   │   ├── src/
│   │   │   ├── index.ts          # Dehydrator SDK
│   │   │   └── constants.ts      # Dehydrator 常量
│   │   └ package.json
│   │
│   ├── agents/
│   │   ├── src/
│   │   │   ├── orchestrator.ts   # PI-SDK 编排器
│   │   │   ├── scan-agent.ts     # ScanAgent
│   │   │   ├── cluster-agent.ts  # ClusterAgent
│   │   │   └── outline-agent.ts  # OutlineAgent
│   │   └ package.json
│   │
│   ├── types/
│   │   ├── src/
│   │   │   └── index.ts          # 共享类型定义
│   │   └ package.json
│   │
│   └── utils/
│   │   ├── src/
│   │   │   ├── file.ts           # 文件工具函数
│   │   │   └── logger.ts         # 日志工具
│   │   └ package.json
│
├── pnpm-workspace.yaml
├── package.json                  # root package.json
└── tsconfig.json                 # root tsconfig
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'cli'
  - 'packages/*'
```

## 13. CLI 交互流程

```bash
$ cd /path/to/project
$ open-zread

🔄 正在扫描项目...
  ✓ 已扫描 1,523 个文件 (12.3s)

🔄 正在加载解析器...
  ✓ 已加载 tsx, vue, typescript 解析器 (2.1s)

🔄 正在提取符号...
  ✓ 已提取 2,847 个符号 (15.6s)

🔄 正在脱水压缩...
  ✓ 骨架生成完成

🔄 正在调用 Agent...
  ✓ ScanAgent: 技术栈识别完成
  ✓ ClusterAgent: 核心模块标记完成
  ✓ OutlineAgent: Wiki 目录生成完成

✅ 蓝图已生成: .open-zread/drafts/wiki.json
```

## 14. 错误处理

| 场景 | 处理方式 |
|------|----------|
| API Key 未配置 | 提示用户设置环境变量 |
| 项目无代码文件 | 提示"未找到可解析的源文件" |
| WASM 下载失败 | 重试 3 次，失败后跳过该语言 |
| LLM 调用失败 | 显示错误信息，建议检查 API Key |

## 15. 技术栈

- **运行时：** Bun
- **语言：** TypeScript
- **CLI UI：** Ink (React for CLI)
- **解析器：** web-tree-sitter
- **Agent 编排：** PI-SDK
- **包管理：** pnpm-workspace