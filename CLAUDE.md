# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@DESIGN.md

# UI 开发规则
编写 UI 代码时，请严格遵循上方导入的 DESIGN.md 文件中指定的设计系统、颜色和组件规范。

## 开发命令

构建与开发：
- `bun run dev` - 以开发模式运行 CLI
- `bun run build` - 构建所有包（Turbo 协调各包构建）
- `bun run build:cli` - 单独构建 CLI（输出 `cli/dist/index.js`）
- `bun run lint` - 运行 ESLint 检查
- `bun run lint:fix` - 自动修复 ESLint 问题
- `bun run typecheck` - TypeScript 类型检查（不生成文件）

测试：
- `bun test` - 运行所有测试
- `bun test packages/repo-analyzer/src/repo-map/__tests__/repo-map.test.ts` - 运行 Repo Map 单元测试
- `bun test -w` - 监听模式运行测试

## 包管理器

本项目使用 **Bun**（v1.3.0）。请勿使用 npm 或 pnpm 命令。

## 架构

这是一个由 Turbo 管理的 monorepo，包含 5 个包 + CLI。数据流程如下：

```
CLI (React/Ink 终端 UI) → Scanner → Parser → SymbolCache → Orchestrator Agent → wiki.json
```

### 包依赖关系

```
types        → （无依赖，共享类型定义）
utils        → types（文件 I/O、配置、缓存、存储、输出）
repo-analyzer → types, utils（文件扫描、解析、Repo Map 生成）
agent-sdk    → （独立 Agent SDK - 支持 Anthropic/OpenAI）
orchestrator → agent-sdk, repo-analyzer, utils, types（Agent 编排层）
cli          → orchestrator, utils, repo-analyzer（Ink 终端 UI）
```

### 各包概述

- **@open-zread/types**: 共享 TypeScript 接口，模块化结构：
  - `manifest.ts` - FileManifest, FileInfo
  - `symbols.ts` - SymbolManifest, SymbolInfo
  - `wiki.ts` - WikiPage, WikiOutput, TechStackSummary
  - `config.ts` - AppConfig
  - `cache.ts` - CacheManifest
  - `repo-map.ts` - 三层 Repo Map 类型
- **@open-zread/utils**: 文件 I/O 工具、从 `~/.zread/config.yaml` 加载配置、缓存管理（SymbolCache、last_manifest.json）、存储（WikiStore）、输出生成
- **@open-zread/repo-analyzer**: 两阶段代码处理 + 三层 Repo Map：
  1. Scanner - 使用 glob/ignore 模式查找源文件
  2. Parser - 使用 web-tree-sitter WASM 解析器提取符号
  3. 三层 Repo Map - 目录树 → 核心签名 → 模块详情（分层递进）
- **@open-zread/agent-sdk**: 完整的 Agent SDK，包含 30+ 工具（文件 I/O、shell、web、agents、tasks、teams）、MCP 服务器集成、技能系统、上下文压缩、重试逻辑、会话持久化、钩子系统。支持 Anthropic 和 OpenAI 提供商。
  
  **类型安全工具开发**：
  - 工具输入使用 `ToolInputParams`（JsonValue 类型）
  - 使用辅助函数安全提取值（从 `@open-zread/agent-sdk` 导入）：
    - `getRequiredString(input, 'name')` - 必需字符串
    - `getString(input, 'path')` - 可选字符串
    - `getNumber(input, 'limit')` - 数字
    - `getBoolean(input, 'flag')` - 布尔
    - `getArray<T>(input, 'items')` - 数组
    - `getObject<T>(input, 'config')` - 对象
  - catch 错误使用 `unknown` 类型，用 `err instanceof Error ? err.message : String(err)` 获取消息
- **@open-zread/orchestrator**: Agent 编排层，使用三层 Repo Map 递进分析项目，生成 wiki.json。后续会扩展更多 Agent（wiki 生成、wiki 更新等）。

### Repo Map 架构（packages/repo-analyzer/src/repo-map）

**三层 Repo Map** - 分层递进的项目上下文生成，解决 AI 漂移问题：

```
Layer 1: 目录树        → 建立全局模块框架（约 200-500 tokens）
Layer 2: 核心签名      → 理解核心 API 边界（Ref >= 5）
Layer 3: 模块详情      → 深入具体模块实现（按需加载）
```

```
repo-map/
├── index.ts           # buildRepoMap() + 三层函数（buildDirectoryTreeOnly, buildCoreSignatures, buildModuleDetails）
├── formatter.ts       # 树状格式化（├──、[Ref: N]、/** 注释 */）
├── prioritizer.ts     # 优先级计算（引用权重 10 + 导出权重 5 + 深度权重）
├── token-counter.ts   # Token 预算管理（默认 2048）
├── reference-counter.ts # 引用计数（从 imports 解析）
└── constants.ts       # 配置常量
```

三层输出示例：
```
# Layer 1: 目录树
Project Structure
├── packages/
│   ├── types/
│   ├── utils/
│   ├── repo-analyzer/

# Layer 2: 核心签名（Ref >= 5）
Core Files Signatures (Ref >= 5)
├── packages/utils/src/config.ts [Ref: 15]
│   [Export] function loadConfig(): AppConfig
├── packages/types/src/index.ts [Ref: 12]
│   [Export] interface WikiPage { slug, title, section }

# Layer 3: 模块详情（指定路径）
Module Details: packages/auth/src/
├── login.ts [Ref: 11]
│   [Export] function login(email, password): Promise<User>
│   function validateEmail(email): boolean
```

### Orchestrator Agent 架构（packages/orchestrator）

Agent 编排层完成 wiki.json 生成，使用三层 Repo Map 递进分析：

```
orchestrator/
├── agents/
│   └── create-agent.ts      # Agent 创建方法（7 个工具，maxTurns=30）
├── prompts/
│   └── generate-catalog.mdx # 提示词（三层工作流程）
├── tools/
│   ├── output-tools.ts      # GenerateBlueprintTool, ValidateBlueprintTool
│   └── repo-map-tools.ts    # 三层工具（get_directory_tree, get_core_signatures, get_module_details）
├── orchestrator.ts          # generateWikiCatalog() 入口
└── types.ts                 # 类型定义
```

Agent 工具列表（三层 Repo Map）：
- `get_directory_tree` - Layer 1: 纯目录结构（无符号，约 200-500 tokens）
- `get_core_signatures` - Layer 2: 核心文件签名（Ref >= 5，仅导出）
- `get_module_details` - Layer 3: 模块完整详情（按需加载）
- `generate_blueprint` - 生成 wiki.json
- `validate_blueprint` - 验证关联文件存在性
- `Read` - 补充读取配置文件
- `Glob` - 搜索特定文件

### CLI 流程（5 步）

```
1. Load config    → ~/.zread/config.yaml
2. Scan files     → FileManifest
3. Check cache    → 增量处理（哈希比对）
4. Parse files    → SymbolManifest → SymbolCache
5. Orchestrator Agent → 三层 Repo Map:
   - get_directory_tree → 建立全局框架
   - get_core_signatures → 理解核心 API
   - get_module_details → 深入模块分析（按需）
   - generate_blueprint → wiki.json
   - validate_blueprint → 验证关联文件
```

### 缓存文件

- `last_manifest.json` - 文件清单（路径、哈希、大小）
- `last_symbols.json` - 符号信息（exports、functions、imports、docstrings）

缓存位于 `.open-zread/cache/` 目录。

### 必需配置

CLI 需要 `~/.zread/config.yaml` 配置 LLM 设置：

```yaml
language: zh
doc_language: zh
llm:
  provider: anthropic
  model: claude-sonnet-4-6
  api_key: <密钥>
  base_url: https://api.anthropic.com
concurrency:
  max_concurrent: 5
  max_retries: 3
```

## 构建系统

- Turbo 协调构建，任务依赖：`build` 依赖 `^build`、`typecheck`、`lint`
- 各包使用 tsup 进行 ESM 打包并生成 DTS 类型声明
- CLI 使用 Bun 的打包器，目标运行时为 Bun
- WASM 文件（yoga.wasm、tree-sitter.wasm、mappings.wasm）在构建时复制到 CLI dist 目录

## 代码风格

ESLint 配置采用 TypeScript 严格模式：

**类型检查规则**：
- `@typescript-eslint/no-explicit-any`: 错误级别 - 禁止使用 `any` 类型
- `@typescript-eslint/no-unused-vars`: 下划线前缀变量（`_`、`_var`）可忽略
- catch 语句使用 `unknown` 类型，通过类型守卫访问错误属性

**例外情况**（仅允许 any）：
- MCP SDK 客户端（动态 API 类型）
- token 估算函数（接受任意消息格式）
- 第三方库类型不兼容时（添加 eslint-disable 注释并说明原因）

**类型转换模式**：
- `input.xxx as T` → 使用辅助函数 `getXxx(input, 'xxx')`
- `err.message` → `err instanceof Error ? err.message : String(err)`
- 复杂类型转换使用 `as unknown as T` 双重转换

## 输出目录结构

运行 CLI 后生成：

```
.open-zread/
├── cache/
│   ├── last_manifest.json
│   └── last_symbols.json
├── drafts/
│   └── wiki.json          # Orchestrator Agent 输出
└── output/
    └── wiki/              # 最终 Wiki 文档（待实现）
```

## Wiki 章节规范

wiki.json 的 section 字段用于导航分组，推荐分类：

| section | 适用章节 |
|---------|---------|
| 入门指南 | 项目概览、快速开始、架构设计 |
| 核心模块 | 各模块章节 |
| 集成扩展 | MCP、插件、扩展 |
| 应用程序 | CLI、GUI、扩展应用 |
| 高级主题 | 性能优化、安全、自定义 |
| 开发指南 | 测试、贡献、部署 |

slug 编号从 1 开始连续递增，格式为 `N-module-name`（英文）。

**associatedFiles 支持文件和目录两种路径：**
- 文件路径：`README.md`、`package.json`（入门章节关联根目录文件）
- 目录路径：`packages/auth/src/`（模块章节关联整个目录，以 `/` 结尾）
- 后续生成 Wiki 内容时会扫描关联目录下所有源文件