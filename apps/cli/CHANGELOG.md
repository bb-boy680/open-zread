# @open-zread/cli

## 1.0.0

### Major Changes

- 22f1d50: ## v1.0.0 — First Stable Release

  Turn any project into a high-quality Wiki documentation library with a single command.

  ### Installation

  ```bash
  npm install -g @open-zread/cli
  # or
  bun install -g @open-zread/cli
  ```

  After installing, run:

  ```bash
  open-zread
  ```

  On first use, you'll be guided through LLM Provider and API Key configuration.

  ### Core Capabilities

  **Intelligent Code Analysis**

  - Real AST parsing via web-tree-sitter (not regex), with deep symbol extraction for 6 languages: TypeScript, JavaScript, Go, Python, Vue
  - 17-language file recognition (TS/JS/Go/Rust/Python/Java/C++/Kotlin/Swift/Ruby/PHP/C#/Scala, etc.)
  - Three-layer Repo Map: directory topology → core signatures → module details, with token-budget-aware trimming
  - Multi-factor file prioritization: reference count, export count, directory depth
  - Vue SFC support with automatic `<script lang="ts">` detection and parser delegation

  **Wiki Generation Engine**

  - Two-phase pipeline: Blueprint Agent generates catalog → concurrent Page Agents generate module docs
  - Feature-first module grouping (not physical directory mapping), product-perspective naming
  - Enforced source traceability: every claim must include `Sources: [filename](path#Lstart-Lend)` citations
  - Auto-generated Mermaid architecture diagrams, tech stack analysis, code examples, and learning paths
  - Concurrency control (1–10), retry on failure (0–5), single-page failure isolation

  **Incremental Sync**

  - MD5 hash-based change detection for added, modified, and deleted files
  - Three-phase sync: detect → LLM re-plan (new/updated/archived pages) → regenerate only changed pages
  - Zero cost when no changes detected — LLM calls are skipped entirely

  **Browse Preview**

  - Built-in Express web server for one-click Wiki preview in the browser
  - API endpoints: catalog browsing, content viewing, source code snippet lookup with line ranges
  - Auto-switching between dev and production environments, auto-opens browser

  ### Interactive Terminal UI

  - Context-aware home menu: dynamically shows up to 8 action options based on Wiki state
  - Real-time streaming display: full-chain LLM request/response/tool-call visualization with token usage and duration
  - Four generation modes: new generate / continue / manage (selective regeneration) / force regenerate
  - Sync page tags: `[新增]` (new), `[更新]` (updated), `[归档]` (archived)
  - Virtual scrolling list for smooth rendering with hundreds of pages
  - Per-page retry: select a failed page and press `r` to retry

  ### Configuration System

  - **20+ LLM Providers**: Anthropic, OpenAI, DeepSeek, Zhipu AI, Qwen, Doubao, Kimi, MiniMax, Yi, Baichuan, Baidu, StepFun, Google Gemini, Mistral, Cohere, Groq, xAI, Perplexity, OpenRouter, and more
  - Dynamic provider registry: syncs from LiteLLM with 24-hour cache, falls back to built-in data offline
  - Custom provider wizard: three-step setup (Base URL → Model name → API Key) with URL validation
  - Model capability tags: `[tools]`, `[vision]`, `[thinking]` at a glance
  - Provider search: press `/` to activate inline search with real-time filtering
  - Adjustable concurrency (1–10) and retry limit (0–5)

  ### Internationalization

  - Full Chinese and English support (UI language and document language configured independently)
  - Hot-reload UI language switching — no restart required
  - Config file: `~/.zread/config.yaml`

  ### Caching & Storage

  - Incremental cache: dual-layer file Manifest + symbol Manifest caching
  - Version snapshots: named `{date}_{time}_{git_hash}`, diffable across commits
  - Wiki Store: organized by Section directories, with archive and version management

## 0.1.8

### Patch Changes

- e0d87a3: Fix provider configuration and mermaid preview zoom issues

  **Bug Fixes:**

  - **provider**: Support custom provider and auto-detect API format from base_url

    - Add 'custom' provider mapping to openai-completions API type
    - Pass provider field from config to SDK as providerId
    - Fix base_url '/anthropic' detection priority in extractProviderId()
    - Fixes #25

  - **browse**: Fix mermaid wheel zoom not following mouse position
    - Fix zoom centering on SVG center instead of mouse position
    - Remove viewport flex centering, set transform-origin to left top
    - Add mouse-following offset calculation in handleWheel

## 0.1.7

### Patch Changes

- 31fe614: Add browse preview service integration

## 0.1.6

### Patch Changes

- 0c683c5: Initial beta release

## 0.1.6-beta.0

### Patch Changes

- 0c683c5: Initial beta release

## 0.1.5

### Patch Changes

- 3df15d1: remove unused outputPath and coreModules from orchestrator

## 0.1.4

### Patch Changes

- 724660e: Fix fullscreen-ink dependency location and CI bun version consistency

## 0.1.3

### Patch Changes

- 25b9f58: Fix CI build consistency with frozen lockfile

## 0.1.2

### Patch Changes

- 406045a: Fix WASM loading error: bundle tree-sitter.wasm and mappings.wasm, correct path resolution

## 0.1.1

### Patch Changes

- e7c9a00: Fix peer dependency warnings (ink ^5.0.0) and runtime version read error
