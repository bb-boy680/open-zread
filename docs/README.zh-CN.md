<p align="center">
  <a href="../README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<h1 align="center">Open Zread</h1>

<p align="center">
  <strong>一行命令，把任意代码库变成高质量 Wiki。</strong><br>
  开源、AI 驱动的代码库领航员，<a href="https://zread.ai/">zread.ai</a> 的精神续作。
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@open-zread/cli?style=flat-square&color=0075de" alt="npm">
  <img src="https://img.shields.io/badge/License-MIT-3178C6?style=flat-square" alt="license">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-success?style=flat-square" alt="Node version">
  <img src="https://img.shields.io/badge/Bun-1.3%2B-f6f5f4?style=flat-square" alt="Bun">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-0075de?style=flat-square" alt="AI Powered">
  <img src="https://img.shields.io/badge/Wiki-Generator-2a9d99?style=flat-square" alt="Wiki Generator">
  <img src="https://img.shields.io/badge/Multi--Agent-Orchestration-391c57?style=flat-square" alt="Multi-Agent">
  <img src="https://img.shields.io/badge/LLM-75%2B%20Providers-dd5b00?style=flat-square" alt="LLM Providers">
  <img src="https://img.shields.io/badge/Tree--sitter-AST-1aae39?style=flat-square" alt="Tree-sitter">
  <img src="https://img.shields.io/badge/Mermaid-Diagrams-ff64c8?style=flat-square&logo=mermaid&logoColor=white" alt="Mermaid">
</p>

<p align="center">
  <a href="https://github.com/bb-boy680/open-zread">GitHub</a> ·
  <a href="https://www.npmjs.com/package/@open-zread/cli">npm</a> ·
  <a href="https://github.com/bb-boy680/open-zread/issues">Issues</a>
</p>

<p align="center">
  <img src="../static/open-zread.png" width="90%" alt="Open Zread 终端界面">
</p>

---

## 为什么选择 Open Zread？

文档会腐烂，Open Zread 让它持续保鲜。

- **几分钟接手新项目，而非几周。** 任何陌生代码库都能得到模块边界清晰、配套架构图的 Wiki。
- **专注写代码。** AI 自动提取接口、依赖和调用示例 —— 不必边写代码边补注释。
- **刷新，而非重写。** 符号级增量缓存让代码变更后的重跑既快又省。
- **真正支持后端语言。** 基于 `web-tree-sitter`,支持 14 种语言的 AST 解析 —— TypeScript、JavaScript、Vue、Go、Python、Rust、Java、C、C++、C#、Ruby、Swift、Kotlin、PHP。
- **代码始终属于你。** 完全开源、本地运行,没有厂商锁定,数据不出本机。
- **任选 LLM。** 19 家一线 Provider —— Anthropic、OpenAI、Google、DeepSeek、Moonshot、Qwen、Doubao、xAI、Groq 等 —— 加 LiteLLM 注册表动态发现的数百款模型。

## 核心特性

> [!TIP]
> Open Zread 不是 LLM API 的简单封装,而是一个专为「理解代码库」打造的完整 Agent 运行时。

- **三层 Repo Map** —— 目录拓扑 → 高频签名 → 按需深挖。支持超大型 Monorepo,绝不撑爆 Token 预算。
- **符号级增量缓存** —— 基于 AST Hash,未变更符号秒级跳过。Wiki Sync 只会重写源文件真正改动的页面。
- **并发 Page Agent** —— `p-limit` 调度的扇出执行,并发度可配。每个 Agent 只负责一个页面、只读它真正需要的代码。
- **进程内 Agent SDK** —— 内置 32 个工具(Bash、Read、Write、Edit、Glob、Grep、WebFetch、WebSearch、Agent、Task、Cron、Skill、MCP、LSP、Worktree、Plan 等),20+ 生命周期 Hook 钩子点,结构化流式输出,自动指数退避重试,对话压缩,Session 持久化转写。
- **原生 MCP 支持** —— 通过 stdio、SSE 或流式 HTTP 连接任意 Model Context Protocol 服务,外部工具会以 `mcp__<server>__<tool>` 形式出现在 Agent 中。
- **Skill 系统** —— 可复用的 Prompt + 工具集合包。内置 5 个(`commit`、`debug`、`review`、`simplify`、`test`),亦可注册自定义 Skill。
- **Provider 无关** —— 在 Anthropic Messages 与 OpenAI Chat Completions API 之上做了统一抽象。TUI 里新建 Provider、粘贴 Key、选模型,完事。
- **成本可见** —— Claude / GPT / DeepSeek 系列模型的逐 Token 价格表内置,生成过程中实时显示成本计。
- **双语 TUI** —— 完整的中英文界面;UI 语言与 Wiki 输出语言独立配置。
- **本地 Web 阅读器** —— `open-zread browse` 启动 Vite + React 应用,自带侧边栏导航、Mermaid 渲染、代码高亮和暗色模式。
- **Wiki Sync 而非 Wiki Dump** —— 差异感知的重生成:页面会被标记为 `new`、`updated`、`unchanged` 或 `archived`,像审查代码 Diff 一样审阅变更。

## 快速开始

> [!NOTE]
> 需要 Node.js 18 或更高版本。

全局安装:

```bash
npm i -g @open-zread/cli
```

在任意项目根目录下运行:

```bash
open-zread
```

在终端 UI 中:

1. 添加大模型 API Key(支持 75+ 家 Provider —— OpenAI、Anthropic、DeepSeek 等)。
2. 选择模型,点击 `Generate Documentation`。
3. 看着并发 Agent 阅读代码,生成带 Mermaid 架构图的 `Wiki/` 目录。

在浏览器中阅读生成结果:

```bash
open-zread browse
```

本地 Web 服务启动后,可享受侧边栏导航、Mermaid 渲染与代码高亮。

## CLI 命令

| 命令                  | 作用                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `open-zread`          | 默认 —— 打开 Wiki TUI。自动识别已有 Wiki,可选生成 / 同步 / 浏览。                          |
| `open-zread wiki`     | 显式触发 Wiki 生成,与默认命令相同。                                                        |
| `open-zread config`   | 交互式配置编辑器 —— Provider、API Key、模型、并发数、重试、语言。                          |
| `open-zread browse`   | 在 `http://localhost:5173` 启动本地 Web 阅读器。                                          |

三个子命令均启动基于 Ink 的 TUI,支持方向键与 Vim 风格快捷键。

### TUI 快捷键

| 按键      | 作用                          |
| --------- | ----------------------------- |
| `↑ / ↓`   | 移动焦点                      |
| `Enter`   | 选中                          |
| `Esc`     | 返回 / 取消                   |
| `q`       | 退出                          |
| `Tab`     | 表单下一项                    |
| `Ctrl+C`  | 强制退出                      |

## 运行掠影

<p align="center">
  <img src="../static/open-zread.config.png" width="48%" alt="Provider 配置">
  <img src="../static/open-zread.config-llm.png" width="48%" alt="模型选择">
</p>
<p align="center">
  <em>在终端内直接管理 Provider 和模型,无需切换工具。</em>
</p>

<p align="center">
  <img src="../static/open-zread.wiki.png" width="90%" alt="多 Agent 并发生成 Wiki">
</p>
<p align="center">
  <em>N 个并发 Page Agent 阅读真实代码,实时产出结构化 Markdown。</em>
</p>

<p align="center">
  <img src="../static/browse.png" width="90%" alt="本地 Web 预览">
</p>
<p align="center">
  <em><code>open-zread browse</code> —— 在浏览器中阅读生成的 Wiki。</em>
</p>

## 工作原理

Open Zread 不会把代码粗暴地塞给大模型,而是模拟顶级架构师阅读源码的认知流:

```text
你的代码库
   │
   ├── 1. 扫描     glob + .gitignore,精确定位每一个源码文件
   │
   ├── 2. 解析     web-tree-sitter 提取导出、签名与依赖关系
   │
   ├── 3. 缓存     符号级 AST 哈希,未变更文件直接跳过,省时省钱
   │
   ├── 4. 蓝图     规划 Agent 构建三层 Repo Map:
   │                  ├─ 层一  目录拓扑       → 建立宏观架构
   │                  ├─ 层二  核心签名       → 寻找高频引用接口
   │                  └─ 层三  按需深挖       → 划分业务边界 → wiki.json
   │
   └── 5. 创作     N 个并发 Page Agent 针对每个模块阅读真实代码,
                   绘制 Mermaid 图表,产出精致 Markdown。
```

三层 Repo Map 是关键技巧:每一层只在上一层判断需要时才放大,从而支持超大代码库而不会撑爆 Token 预算。

### 为什么 Repo Map 很重要

一个 5 万行代码的项目全文序列化约 200 万 Token,远超任何上下文窗口。常见的折中方案要么牺牲保真度(在 README 上做切片 RAG),要么烧钱(每生成一页都重新喂整棵树)。

三层 Repo Map 借鉴的是人类架构师的真实上手流程:

1. **先看拓扑。** 什么放在哪儿?哪些目录像基础设施、哪些像业务领域?
2. **再看热签名。** 哪些导出被引用得最多?那就是承重接口。
3. **按需深挖。** 只在规划 Agent 决定要为模块 X 写一页时,才打开模块 X 的完整 AST。

结果:10 万行代码的仓库只用 ~5k Token 就能完成宏观画像,而每个页面 Agent 只拉取自己真正需要的内容。

### Wiki 同步:差异感知的重生成

在改动后的代码库上重跑,**不会**把已有 Wiki 推倒重来。Orchestrator 会:

1. 重新计算每个文件的 AST 哈希。
2. 与缓存的符号清单 Diff。
3. 根据每页所覆盖的源文件,把页面标记为 **unchanged**、**updated**、**new** 或 **archived**。
4. 让你确认后,只重生成受影响的页面。归档页面会快照到 `.open-zread/wiki/archived/<时间戳>/` 下,不会丢失。

## 支持的语言

| 语言                      | AST 解析器                                | 状态   |
| ------------------------- | ----------------------------------------- | :----: |
| TypeScript / TSX          | tree-sitter-typescript                    |  ✅   |
| JavaScript / JSX          | tree-sitter-javascript                    |  ✅   |
| Vue (SFC)                 | 自定义 script 抽取 → TS / JS 解析器       |  ✅   |
| Go                        | tree-sitter-go                            |  ✅   |
| Python                    | tree-sitter-python                        |  ✅   |
| Rust                      | tree-sitter-rust                          |  ✅   |
| Java                      | tree-sitter-java                          |  ✅   |
| C                         | tree-sitter-c                             |  ✅   |
| C++                       | tree-sitter-cpp                           |  ✅   |
| C#                        | tree-sitter-c_sharp                       |  ✅   |
| Ruby                      | tree-sitter-ruby                          |  ✅   |
| Swift                     | tree-sitter-swift                         |  ✅   |
| Kotlin                    | tree-sitter-kotlin                        |  ✅   |
| PHP                       | tree-sitter-php                           |  ✅   |

新增一门语言主要就是在 `packages/repo-analyzer/src/parser/` 中注册其 Tree-sitter 语法、WASM 映射和 SCM 查询。欢迎提 PR。

## 支持的 LLM Provider

内置 19 家一线 Provider 与精选默认模型,并通过 [LiteLLM 模型注册表](https://github.com/BerriAI/litellm) 动态发现数百款额外模型。

| 海外                                                                             | 国内                                                                                              | OpenAI 兼容聚合 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------- |
| Anthropic · OpenAI · Google Gemini · Mistral · Cohere · xAI · Groq · Perplexity | DeepSeek · Moonshot · MiniMax · 智谱 Zhipu · Qwen · Doubao · 零一万物 Yi · 百川 Baichuan · 百度 · 阶跃 StepFun | OpenRouter,以及任意 OpenAI 兼容端点 |

没有你的 Provider?在 TUI 里添加一个 **Custom Provider**,填上 OpenAI 兼容的 base URL 即可。

## 配置

配置文件位于 `~/.zread/config.yaml`,完全在 TUI 内可编辑,无需手写 YAML:

```yaml
language: zh                 # UI 语言: zh | en
doc_language: zh             # Wiki 输出语言
llm:
  provider: deepseek
  model: deepseek-chat
  api_key: sk-...
  base_url: null             # 可选,覆盖默认端点
concurrency:
  max_concurrent: 5          # 并发 Page Agent 数
  max_retries: 3             # 单次 LLM 调用重试次数
```

Provider 元数据缓存在 `~/.zread/providers.json`(24 小时 TTL),并随二进制内置一份兜底注册表 —— 离线也能配置。

## 输出结构

```
your-project/
└── .open-zread/
    ├── wiki/
    │   ├── wiki.json                    # 蓝图: 页面、章节、技术栈摘要
    │   └── {section}/
    │       └── {page}.md                # 生成的 Markdown 页面
    └── cache/
        ├── manifest.json                # 文件扫描结果
        └── symbols.json                 # AST 哈希符号缓存
```

每页都是纯 Markdown 内嵌 Mermaid 块,可以扔到任何地方渲染(GitHub、GitLab、Docusaurus、Notion 或你自己的静态站点生成器)。

## 适用场景

- **开源维护者** —— 不手写任何文档,就能在 README 之外交付一份真正的 Wiki。
- **新人入职** —— 第一天就让新同事拿到一份代码库导览,而不是第三周。
- **并购技术尽调** —— 一小时内得到陌生代码库的架构总览。
- **遗留代码考古** —— 原作者早已离场,也能找回失落的工程知识。
- **平台 / SDK 团队** —— 通过 CI 触发的重跑,让平台文档与代码持续同步。
- **Code Review 前置** —— 评审 PR 前快速理解其周边模块的架构。

## 方案对比

| 方案                            | 痛点                                            | Open Zread                                                 |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| 手写文档                        | 耗时、过时、没人愿意写                          | AI 从源码生成,重跑即同步                                   |
| Copilot / Cursor                | 文件局部上下文,缺乏全局视角                     | 独创三层 Repo Map,建立上帝视角                             |
| Mintlify / JSDoc                | 仅覆盖前端生态                                  | 14 种语言的 AST 解析,覆盖前后端 |
| 闭源 AI 文档 SaaS               | 订阅费昂贵,代码上传第三方                       | 完全开源、本地运行,数据不出本机                            |
| 朴素 RAG-over-README            | 只能产出干瘪的通用摘要                          | 模块级 Agent 根据真实代码自适应渲染架构与 API              |
| 手搭 Docusaurus / VitePress     | 搭建成本高,内容仍需手写                         | 生成内容可直接落到你现有的静态站点流水线                   |

## 独立使用 Agent SDK

`@open-zread/agent-sdk` 独立发布 —— 不依赖 orchestrator 或 CLI,即可塞进你自己的工具链。

亮点:

- 32 个内置工具(文件 I/O、搜索、Web、子 Agent、任务、Cron、MCP、LSP……)。
- Provider 自带 —— Anthropic、OpenAI 或任意 OpenAI 兼容端点。
- 原生 MCP 支持 —— stdio、SSE、流式 HTTP 三种传输。
- 20+ 生命周期 Hook(`PreToolUse`、`PostToolUse`、`SessionStart`、`PreCompact`、`TaskCompleted`……)。
- 429 / 5xx / 网络错误自动指数退避重试。
- LRU 文件缓存、对话压缩、结构化流式输出、逐 Token 成本追踪。
- Skill 系统提供可复用 Prompt + 工具组合。

## 路线图

| 功能                          | 状态 | 说明                                                                  |
| ----------------------------- | :--: | --------------------------------------------------------------------- |
| 终端 UI 引擎                  |  ✅  | Ink 4 + React 18 交互式 TUI,13 视图,双语(zh / en)                  |
| 独立 Agent SDK                |  ✅  | 32 工具 · 5 Skills · MCP (stdio/SSE/HTTP) · 20+ Hooks · Sessions       |
| 多 LLM Provider 支持          |  ✅  | 19 家一线 + LiteLLM 注册表数百款                                       |
| 三层 Repo Map                 |  ✅  | 目录树 → 核心签名 → 模块详情                                          |
| 符号级增量缓存                |  ✅  | 基于 AST Hash,未变更文件秒跳过                                       |
| 多语言 AST 解析               |  ✅  | 14 种语言: TS/JS、Vue、Go、Python、Rust、Java、C/C++、C#、Ruby、Swift、Kotlin、PHP |
| 并发 Wiki 创作引擎            |  ✅  | `p-limit` 调度扇出,并发可配                                          |
| 差异感知 Wiki Sync            |  ✅  | 标记页面为 `new` / `updated` / `unchanged` / `archived`                |
| TUI 内配置管理                |  ✅  | 无需编辑配置文件即可增删 Provider 与 Key                              |
| 本地 Web 预览                 |  ✅  | React 19 + Vite + Tailwind v4,Mermaid、代码高亮、暗色模式             |
| 成本追踪                      |  ✅  | 生成过程中实时显示逐模型 Token / 成本计                                |
| CI 集成                       |  ☐  | 推送即触发自动同步的 GitHub Action                                    |
| 自定义 Rules & Skills         |  ☐  | 注入团队自有的写作风格与规范                                          |
| 托管预览                      |  ☐  | 一键将生成的 Wiki 发布到托管 URL                                      |

## 常见问题

<details>
<summary><strong>一次跑通大概要多少钱?</strong></summary>

以 ~3 万行 TypeScript 仓库 + DeepSeek V3 为例,首次全量生成通常在 $0.20 以内。之后由于符号缓存,每次 Sync 通常 $0.05 以内。成本基本随 Wiki 页面数线性增长,而非代码行数。
</details>

<details>
<summary><strong>我的代码会上传到哪里吗?</strong></summary>

只会发到你所选的 LLM Provider。Open Zread 自身完全本地运行 —— 无遥测、无服务器、除你选定的 LLM 端点之外不涉及任何第三方。
</details>

<details>
<summary><strong>能在 CI 里用吗?</strong></summary>

可以 —— 配置完整时 CLI 完全非交互。把它包进一个 push 到 main 时触发的 GitHub Action,然后把重生成的 Wiki commit 回去即可。原生 CI 集成在路线图上。
</details>

<details>
<summary><strong>代码库混合多种语言怎么办?</strong></summary>

Open Zread 会解析所有已支持的语言,跳过其余的。混合模块的页面会引用全部文件,但仅对已支持语言渲染结构化细节。
</details>

<details>
<summary><strong>可以自定义 Wiki 风格或结构吗?</strong></summary>

蓝图 Agent 目前使用内置 Prompt。自定义 Rules & Skills 在路线图上 —— 届时可注入团队规范、文风指南与章节模板。
</details>

<details>
<summary><strong>API Key 存在哪儿?</strong></summary>

明文 YAML 形式存在 `~/.zread/config.yaml`。除调用你所配置的 Provider 之外,不会离开你的机器。视其为机密 —— 共享机器时请 `chmod 600`。
</details>

## 参与贡献

Open Zread 正在快速迭代中。Issue、PR、新语言解析器和反馈都非常欢迎。

> [!TIP]
> 第一次贡献?推荐切入点:新增 Tree-sitter 语言(`packages/repo-analyzer/src/parser/language-map.ts`)、注册新 Provider、提交一个内置 Skill,或者改进 `apps/cli/src/i18n/translations/` 下的 i18n 翻译。

```bash
git clone https://github.com/bb-boy680/open-zread.git
cd open-zread
bun install
bun run dev
```

如果这个工具帮到了你,在 GitHub 上点一个 ⭐ 是对作者最大的鼓励。
