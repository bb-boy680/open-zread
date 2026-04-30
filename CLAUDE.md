# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@DESIGN.md

---

## 项目概述

Open Zread 是一个 AI 驱动的 Wiki 文档生成工具。一行命令即可将整个项目转换为高质量的 Wiki 文档库，基于 web-tree-sitter 支持多语言 AST 解析（TS/JS/Go/Rust/Python/Java/C++）。

---

## 开发环境

**包管理器**: Bun 1.3.0+

**启动开发环境**:
```bash
bun run dev
```

> **重要**:
> - LLM 在修改完代码后**不需要执行**开发环境或构建命令。用户会主动执行 `bun run dev` 进行测试。LLM 只需专注于代码修改本身。
> - **每次修改代码后，必须执行** `bun run typecheck` 和 `bun run lint`，确保类型正确且代码符合规范。

**代码质量检查**（**每次修改代码后必须执行**）:
```bash
bun run typecheck  # TypeScript 类型检查 - 必须
bun run lint       # ESLint 代码规范检查 - 必须
bun run lint:fix   # ESLint 自动修复（可选，lint 有错误时使用）
```

**单个包操作**:
```bash
bun run build --filter=@open-zread/cli       # 只构建 CLI 包
bun run dev --filter=@open-zread/orchestrator # 只开发特定包
```

---

## 架构说明

这是一个 Bun Monorepo 项目，使用 Turborepo 进行任务编排。

### 包依赖关系图

```
@open-zread/cli (终端 UI 入口)
    ├── @open-zread/orchestrator (Agent 调度引擎)
    │       ├── @open-zread/agent-sdk (Agent SDK)
    │       ├── @open-zread/repo-analyzer (代码分析)
    │       └── @open-zread/utils (工具函数)
    ├── @open-zread/repo-analyzer
    ├── @open-zread/types (共享类型)
    └── @open-zread/utils
```

---

### 包职责详解

#### 1. `@open-zread/types` (packages/types)

**职责**: 共享类型定义，是整个项目的类型基础。

**核心模块**:
- `manifest.ts`: 文件扫描结果类型 (FileManifest, FileInfo)
- `symbols.ts`: AST 解析符号类型 (SymbolManifest, SymbolInfo)
- `wiki.ts`: Wiki 页面定义与输出类型 (WikiPage, WikiOutput)
- `config.ts`: 应用配置类型 (AppConfig)
- `cache.ts`: 缓存清单结构 (CacheManifest)
- `repo-map.ts`: 三层 Repo Map 类型定义

**依赖**: 无外部依赖，纯类型定义包。

---

#### 2. `@open-zread/utils` (packages/utils)

**职责**: 通用工具函数库，提供文件 I/O、配置管理、缓存、日志等基础设施。

**核心模块**:
- `file-io.ts`: 文件读写、目录操作、路径解析
- `config/`: 配置加载、保存、验证
- `cache/`: 符号级缓存（基于 AST Hash）
- `logger.ts`: 日志系统
- `storage/wiki-store.ts`: Wiki 存储管理
- `storage/versioning.ts`: 版本快照管理
- `output/wiki-content.ts`: Wiki JSON 生成与加载
- `provider-registry/`: LLM Provider 注册表管理（支持 75+ Provider）

**依赖**: `@open-zread/types`

---

#### 3. `@open-zread/repo-analyzer` (packages/repo-analyzer)

**职责**: 代码库分析引擎，负责扫描文件、解析 AST、构建三层 Repo Map。

**核心模块**:
- `scanner/`: 基于 glob + .gitignore 的文件扫描
- `parser/`: web-tree-sitter AST 解析，提取导出与签名
  - `wasm-loader.ts`: WASM 解析器加载
  - `language-map.ts`: 语言映射配置
  - `vue-handler.ts`: Vue SFC 特殊处理
- `repo-map/`: 三层 Repo Map 构建
  - `index.ts`: 主入口 `buildRepoMap()`
  - `formatter.ts`: Repo Map 格式化输出
  - `prioritizer.ts`: 文件优先级排序（高频引用优先）
  - `reference-counter.ts`: 符号引用计数
  - `token-counter.ts`: Token 估算

**三层 Repo Map 结构**:
1. **层一**: 目录拓扑 → 建立宏观架构
2. **层二**: 核心签名 → 寻找高频引用接口
3. **层三**: 模块详情 → 划分业务边界，生成 wiki.json

**依赖**: `@open-zread/types`, `@open-zread/utils`, `web-tree-sitter`, `glob`

---

#### 4. `@open-zread/agent-sdk` (packages/agent-sdk)

**职责**: 开源 Agent SDK，提供完整的 Agent 运行环境，无需依赖外部 CLI。

**核心模块**:
- `agent.ts`: 高级 Agent API (`Agent`, `createAgent`, `query`)
- `engine.ts`: Agent 执行引擎 (`QueryEngine`)
- `providers/`: LLM Provider 抽象层
  - `anthropic.ts`: Anthropic Claude 支持
  - `openai.ts`: OpenAI 支持
  - `types.ts`: Provider 类型定义
- `tools/`: 30+ 内置工具
  - 文件 I/O: `read.ts`, `write.ts`, `edit.ts`
  - 搜索: `glob.ts`, `grep.ts`
  - 执行: `bash.ts`
  - Web: `web-fetch.ts`, `web-search.ts`
  - 多 Agent: `agent-tool.ts`, `send-message.ts`, `team-tools.ts`
  - 任务管理: `task-tools.ts`
  - MCP: `mcp-resource-tools.ts`, `sdk-mcp-server.ts`
  - 其他: `lsp-tool.ts`, `cron-tools.ts`, `plan-tools.ts`, `skill-tool.ts`
- `skills/`: Skill 系统（可复用的 Prompt 模板）
  - `bundled/`: 内置 Skills (commit, debug, review, simplify, test)
  - `registry.ts`: Skill 注册管理
- `hooks.ts`: Hook 系统（生命周期钩子）
- `session.ts`: Session 持久化管理
- `utils/`: 工具函数
  - `compact.ts`: 对话压缩
  - `tokens.ts`: Token 估算与成本计算
  - `retry.ts`: 重试逻辑（指数退避）
  - `fileCache.ts`: 文件状态 LRU 缓存

**依赖**: `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `zod`

---

#### 5. `@open-zread/orchestrator` (packages/orchestrator)

**职责**: Wiki Blueprint 生成引擎，使用 Agent 调度生成 Wiki 目录和内容。

**核心模块**:
- `orchestrator.ts`: Wiki Catalog 生成入口 (`generateWikiCatalog`)
- `wiki/generate-wiki.ts`: Wiki 内容生成 (`generateWikiContent`)
- `agents/create-agent.ts`: Page Agent 创建
- `agents/uitls.ts`: Agent 工具函数
- `prompts/`: Prompt 模板
  - `generate-catalog.ts`: Catalog 生成 Prompt
  - `page-agent.ts`: Page Agent Prompt
- `tools/`: 专用工具
  - `repo-map-tools.ts`: Repo Map 交互工具
  - `page-tools.ts`: Wiki 页面操作工具
  - `output-tools.ts`: 输出工具

**工作流程**:
1. 接收 repo-analyzer 的 Repo Map
2. 调用 Agent 生成 Wiki Catalog（模块划分）
3. N 个并发 Page Agent 生成各模块的 Markdown 文档
4. 输出到 Wiki/ 目录

**依赖**: `@open-zread/agent-sdk`, `@open-zread/repo-analyzer`, `@open-zread/utils`, `@open-zread/types`

---

#### 6. `@open-zread/cli` (cli)

**职责**: 终端 UI 入口，基于 Ink + React 的交互式 CLI 应用。

**核心模块**:
- `src/index.tsx`: CLI 入口，bin 命令绑定
- `src/App.tsx`: 应用路由配置
- `src/layout/`: 布局组件
- `src/views/`: 视图组件
  - `wiki-home/`: Wiki 生成首页
  - `wiki-generate/`: Wiki 生成进度页
  - `config-*/`: 配置管理页面（API Key、Provider、Model 等）
- `src/provider/`: React Context Provider
  - `config/`: 配置状态管理
  - `wiki/`: Wiki 生成状态管理
  - `i18n/`: 国际化支持
- `src/components/`: 通用组件（Divider, Spinner, StatusRow 等）
- `src/i18n/`: 国际化翻译（zh-CN, en-US）
- `src/theme.ts`: 主题配置

**依赖**: `ink`, `react`, `react-router`, `zustand`, `use-immer`, 以及所有内部包

---

## 修改文件指南

### CLI UI 修改

修改终端 UI 时，严格遵循 `DESIGN.md` 中的设计系统：
- **颜色**: 使用 Notion 风格的暖色调（`#f6f5f4` warm white, `#31302e` warm dark）
- **边框**: 超细边框 `1px solid rgba(0,0,0,0.1)`（whisper border）
- **字体**: NotionInter，display 大标题使用负 letter-spacing（-2.125px at 64px）
- **阴影**: 多层叠加，单层 opacity 不超过 0.05

### Agent SDK 修改

Agent SDK 是独立可复用的包，修改时注意：
- 保持 Provider 抽象层的通用性
- 工具定义使用 Zod schema
- Skill 注册遵循 `SkillDefinition` 类型

### Orchestrator 修改

修改 Orchestrator 时：
- Agent Prompt 模板在 `prompts/` 目录
- 并发控制使用 `p-limit`
- Wiki 输出遵循 `WikiOutput` 类型

---

## 发布流程

使用 Changesets 管理版本发布：

```bash
bun run changeset      # 创建变更记录
bun run version        # 更新版本号
bun run release        # 发布到 npm
```

---

# UI 开发规则

编写 UI 代码时，请严格遵循上方导入的 DESIGN.md 文件中指定的设计系统、颜色和组件规范。