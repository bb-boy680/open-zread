# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

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

## 包管理器

本项目使用 **Bun**（v1.3.0）。请勿使用 npm 或 pnpm 命令。

## 架构

这是一个由 Turbo 管理的 monorepo，包含 5 个包 + CLI。数据流程如下：

```
CLI (React/Ink 终端 UI) → Blueprint → Agents → Skeleton/Core → wiki.json 输出
```

### 包依赖关系

```
types        → （无依赖，共享类型定义）
core         → types（文件 I/O、配置、缓存、存储、输出）
skeleton     → types, core（文件扫描、解析、脱水）
agent        → （独立 Agent SDK - 支持 Anthropic/OpenAI）
blueprint    → agent, skeleton, core, types（Wiki 蓝图生成）
cli          → blueprint, core, skeleton（Ink 终端 UI）
```

### 各包概述

- **@open-zread/types**: 共享 TypeScript 接口（FileManifest、SymbolManifest、DehydratedSkeleton、WikiPage、AppConfig 等）
- **@open-zread/core**: 文件 I/O 工具、从 `~/.zread/config.yaml` 加载配置、缓存管理（manifest/skeleton 差异比对）、存储（WikiStore、版本管理）、输出生成
- **@open-zread/skeleton**: 三阶段代码处理：
  1. Scanner - 使用 glob/ignore 模式查找源文件
  2. Parser - 使用 web-tree-sitter WASM 解析器提取符号
  3. Dehydrator - 将代码压缩为骨架格式并进行引用计数
- **@open-zread/agent**: 完整的 Agent SDK，包含 30+ 工具（文件 I/O、shell、web、agents、tasks、teams）、MCP 服务器集成、技能系统、上下文压缩、重试逻辑、会话持久化、钩子系统。支持 Anthropic 和 OpenAI 提供商。
- **@open-zread/blueprint**: 协调三个子代理生成 wiki.json：
  1. ScanAgent - 检测技术栈和项目类型
  2. ClusterAgent - 分析代码引用，识别核心模块
  3. OutlineAgent - 设计 Wiki 结构，生成蓝图

### CLI 入口点

- 默认命令（无参数）：运行 Phase 1 - 扫描 → 解析 → 脱水 → 代理 → wiki.json
- `bun run dev wiki`: Phase 2（尚未实现）- wiki.json → markdown 文件

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

ESLint 配置采用 TypeScript 严格模式，以下情况有放宽：
- `@typescript-eslint/no-explicit-any`: 在 agent 工具、MCP 客户端、providers、blueprint 中允许（动态工具输入/API 类型）
- `@typescript-eslint/no-unused-vars`: 下划线前缀变量（`_`、`_var`）可忽略