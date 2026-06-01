<p align="center">
  <a href="README.md">English</a> · <a href="docs/README.zh-CN.md">简体中文</a>
</p>

<h1 align="center">Open Zread</h1>

<p align="center">
  <strong>Turn any codebase into a high-quality Wiki — in a single command.</strong><br>
  An open-source, AI-powered codebase navigator. The spiritual successor to <a href="https://zread.ai/">zread.ai</a>.
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
  <img src="./static/open-zread.png" width="90%" alt="Open Zread terminal UI">
</p>

---

## Why Open Zread?

Documentation rots. Open Zread keeps it alive.

- **Onboard in minutes, not weeks.** Get a Wiki with clear module boundaries and architecture diagrams from any unfamiliar codebase.
- **Stay focused on code.** AI extracts interfaces, dependencies, and usage examples — no need to write doc comments as you go.
- **Refresh, don't rewrite.** Symbol-level incremental cache means re-runs after code changes are fast and cheap.
- **Works on real backends.** Built on `web-tree-sitter` with AST support for 14 languages — TypeScript, JavaScript, Vue, Go, Python, Rust, Java, C, C++, C#, Ruby, Swift, Kotlin, and PHP.
- **Your code stays yours.** Fully open source, runs locally. No vendor lock-in, no data leaving your machine.
- **Bring your own LLM.** 19 first-class providers — Anthropic, OpenAI, Google, DeepSeek, Moonshot, Qwen, Doubao, xAI, Groq and more — plus dynamic discovery for hundreds of models via the LiteLLM registry.

## Features

> [!TIP]
> Open Zread isn't a wrapper around an LLM API — it's a full agent runtime purpose-built for understanding codebases.

- **Three-layer Repo Map** — directory topology → high-frequency signatures → on-demand deep dives. Scales to massive monorepos without overflowing token budgets.
- **Symbol-level incremental cache** — AST-hash based; unchanged symbols skipped instantly across re-runs. Wiki sync only regenerates pages whose source files actually changed.
- **Parallel page agents** — `p-limit`-scheduled fan-out, with configurable concurrency. Each agent owns one Wiki page and reads only the real code it needs.
- **In-process Agent SDK** — 32 built-in tools (Bash, Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Agent, Task, Cron, Skill, MCP, LSP, Worktree, Plan, …), 20+ lifecycle hook points, structured streaming, automatic retry with exponential backoff, conversation compaction, and persistent session transcripts.
- **MCP-ready** — connect to any Model Context Protocol server over stdio, SSE, or streamable HTTP. External tools appear in agents as `mcp__<server>__<tool>`.
- **Skill system** — reusable prompt + tool-set bundles. Five ship by default (`commit`, `debug`, `review`, `simplify`, `test`); you can register your own.
- **Provider-agnostic** — unified abstraction over Anthropic Messages and OpenAI Chat Completions APIs. Add a Provider entry in the TUI, paste a key, pick a model — that's it.
- **Cost-aware** — per-token pricing for Claude, GPT, and DeepSeek model families baked in, with a live cost meter during generation.
- **Bilingual TUI** — full Chinese and English interfaces; choose your Wiki output language independently from your UI language.
- **Local web reader** — `open-zread browse` boots a Vite-powered React app with sidebar navigation, Mermaid rendering, syntax highlighting and dark mode.
- **Wiki sync, not Wiki dump** — diff-aware regeneration: pages are tagged `new`, `updated`, `unchanged` or `archived` so you can review changes like a code diff.

## Quick Start

> [!NOTE]
> Requires Node.js 18 or higher.

Install globally:

```bash
npm i -g @open-zread/cli
```

Run inside any project root:

```bash
open-zread
```

Then in the terminal UI:

1. Add an LLM API key (75+ providers supported — OpenAI, Anthropic, DeepSeek, and more).
2. Pick a model and hit `Generate Documentation`.
3. Watch parallel agents read your code and produce a `Wiki/` folder with Mermaid diagrams.

Browse the result in your browser:

```bash
open-zread browse
```

A local web server starts with sidebar navigation, diagram rendering, and code highlighting.

## CLI Reference

| Command              | What it does                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `open-zread`         | Default — opens the Wiki TUI. Detects existing Wiki and offers generate / sync / browse.   |
| `open-zread wiki`    | Explicit Wiki generation entry. Same TUI as the default command.                           |
| `open-zread config`  | Interactive config editor — providers, API keys, models, concurrency, retries, languages.  |
| `open-zread browse`  | Boots the local web reader at `http://localhost:5173`.                                     |

All three subcommands launch an Ink-based TUI with arrow-key navigation and Vim-friendly shortcuts.

### Keyboard shortcuts (TUI)

| Key      | Action                                |
| -------- | ------------------------------------- |
| `↑ / ↓`  | Move focus                            |
| `Enter`  | Select                                |
| `Esc`    | Back / cancel                         |
| `q`      | Quit                                  |
| `Tab`    | Next field (in forms)                 |
| `Ctrl+C` | Force quit                            |

## Screenshots

<p align="center">
  <img src="./static/open-zread.config.png" width="48%" alt="Provider configuration">
  <img src="./static/open-zread.config-llm.png" width="48%" alt="LLM picker">
</p>
<p align="center">
  <em>Manage providers and models without leaving the terminal.</em>
</p>

<p align="center">
  <img src="./static/open-zread.wiki.png" width="90%" alt="Parallel agents generating wiki">
</p>
<p align="center">
  <em>N parallel page agents read real code and produce structured Markdown in real time.</em>
</p>

<p align="center">
  <img src="./static/browse.png" width="90%" alt="Local web preview">
</p>
<p align="center">
  <em><code>open-zread browse</code> — read the generated Wiki in your browser.</em>
</p>

## How It Works

Open Zread doesn't dump your code into an LLM. It mimics how a senior architect reads a codebase:

```text
Your Codebase
   │
   ├── 1. Scan      glob + .gitignore precisely locate every source file
   │
   ├── 2. Parse     web-tree-sitter extracts exports, signatures, dependencies
   │
   ├── 3. Cache     symbol-level AST hash skips unchanged files — saves time and money
   │
   ├── 4. Blueprint a planning agent builds a three-layer Repo Map:
   │                  ├─ Layer 1  Directory topology  → macro architecture
   │                  ├─ Layer 2  Core signatures      → high-frequency interfaces
   │                  └─ Layer 3  On-demand deep dive  → module boundaries → wiki.json
   │
   └── 5. Create    N parallel page agents read real code per module,
                    render Mermaid diagrams, and emit polished Markdown.
```

The three-layer Repo Map is the trick: it scales to massive codebases without overflowing token budgets, because each layer only zooms in when the previous one says it should.

### Why the Repo Map matters

A 50k-LOC codebase fully serialized as text is ~2M tokens — far beyond any context window. Common workarounds either lose fidelity (chunked RAG over READMEs) or burn money (re-feeding the whole tree for every page).

The three-layer Repo Map borrows from how a human architect actually onboards:

1. **Topology first.** What lives where? Which folders look like infrastructure vs. domain?
2. **Hot signatures next.** Which exports are imported most? Those are the load-bearing interfaces.
3. **Deep dive on demand.** Only when the planning agent commits to writing a page about module X does it open module X's full AST.

The result: a 100k-LOC repo is profiled with ~5k tokens of context, and per-page agents pull in only what they need.

### Wiki sync: diff-aware regeneration

Re-running on a changed codebase doesn't blow away your Wiki. The orchestrator:

1. Rehashes every file's AST.
2. Diffs against the cached symbol manifest.
3. Tags each page as **unchanged**, **updated**, **new**, or **archived** based on which source files it covers.
4. Asks you to confirm, then regenerates only the touched pages. Archived pages are snapshotted under `.open-zread/wiki/archived/<timestamp>/` so nothing is lost.

## Supported Languages

| Language                  | AST Parser                     | Status |
| ------------------------- | ------------------------------ | :----: |
| TypeScript / TSX          | tree-sitter-typescript         |   ✅   |
| JavaScript / JSX          | tree-sitter-javascript         |   ✅   |
| Vue (SFC)                 | Custom script extractor → TS/JS parser |   ✅   |
| Go                        | tree-sitter-go                 |   ✅   |
| Python                    | tree-sitter-python             |   ✅   |
| Rust                      | tree-sitter-rust               |   ✅   |
| Java                      | tree-sitter-java               |   ✅   |
| C                         | tree-sitter-c                  |   ✅   |
| C++                       | tree-sitter-cpp                |   ✅   |
| C#                        | tree-sitter-c_sharp            |   ✅   |
| Ruby                      | tree-sitter-ruby               |   ✅   |
| Swift                     | tree-sitter-swift              |   ✅   |
| Kotlin                    | tree-sitter-kotlin             |   ✅   |
| PHP                       | tree-sitter-php                |   ✅   |

Adding a language is mostly a matter of registering its tree-sitter grammar, WASM mapping, and SCM query in `packages/repo-analyzer/src/parser/`. PRs welcome.

## Supported LLM Providers

19 first-class providers ship with curated model defaults, plus dynamic discovery from the [LiteLLM model registry](https://github.com/BerriAI/litellm) covering hundreds more.

| Western                                            | Chinese                                                                | OpenAI-compatible aggregators |
| -------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| Anthropic · OpenAI · Google Gemini · Mistral · Cohere · xAI · Groq · Perplexity | DeepSeek · Moonshot · MiniMax · Zhipu · Qwen · Doubao · Yi · Baichuan · Baidu · StepFun | OpenRouter and any custom OpenAI-compatible endpoint |

Don't see yours? Add a **Custom Provider** in the TUI with any OpenAI-compatible base URL.

## Configuration

Config lives at `~/.zread/config.yaml` and is fully editable from the TUI — no manual YAML required:

```yaml
language: zh                 # UI language: zh | en
doc_language: zh             # Wiki output language
llm:
  provider: deepseek
  model: deepseek-chat
  api_key: sk-...
  base_url: null             # optional override
concurrency:
  max_concurrent: 5          # parallel page agents
  max_retries: 3             # per LLM call
```

Provider metadata is cached at `~/.zread/providers.json` (24h TTL) with a fallback registry bundled into the binary, so you can configure providers offline.

## Output Structure

```
your-project/
└── .open-zread/
    ├── wiki/
    │   ├── wiki.json                    # Blueprint: pages, sections, tech stack summary
    │   └── {section}/
    │       └── {page}.md                # Generated Markdown pages
    └── cache/
        ├── manifest.json                # File scan results
        └── symbols.json                 # AST-hashed symbol cache
```

Every page is plain Markdown with embedded Mermaid blocks — render anywhere (GitHub, GitLab, Docusaurus, Notion, your own static site generator).

## Use Cases

- **Open-source maintainers** — ship a real Wiki alongside your README without writing a single docs page by hand.
- **Engineering onboarding** — give new hires a guided tour of the codebase on day one instead of week three.
- **Acquisition due diligence** — generate an architecture overview of an unfamiliar codebase in under an hour.
- **Legacy code archaeology** — recover lost institutional knowledge from a codebase whose original authors are long gone.
- **Internal tooling teams** — keep platform / SDK docs continuously in sync with code via CI-triggered re-runs.
- **Code review prep** — quickly understand the architecture of a PR's surrounding context before reviewing.

## Comparison

| Approach                       | Limitation                                           | Open Zread                                                |
| ------------------------------ | ---------------------------------------------------- | --------------------------------------------------------- |
| Manual documentation           | Slow, drifts from code, nobody enjoys it             | AI generates from source; re-run keeps it in sync         |
| Copilot / Cursor               | File-local context, no global view                   | Three-layer Repo Map gives a god's-eye view               |
| Mintlify / JSDoc               | Frontend ecosystems only                             | AST-level parsing for 14 languages across frontend and backend |
| Closed-source AI doc SaaS      | Subscription cost, code uploaded to third parties    | Fully open source, runs locally, your data stays put      |
| Naive RAG-over-README          | Generic summaries with little signal                 | Per-module agents adaptively render APIs and architecture |
| Hand-crafted Docusaurus / VitePress | High setup cost, still requires hand-written content | Generated content drops straight into your existing static-site pipeline |

## Using the Agent SDK Standalone

`@open-zread/agent-sdk` is published independently — drop it into your own tooling without the orchestrator or CLI.

Highlights:

- 32 built-in tools (file I/O, search, web, sub-agents, tasks, cron, MCP, LSP, …).
- Bring-your-own provider — Anthropic, OpenAI, or any OpenAI-compatible endpoint.
- First-class MCP support — stdio, SSE, and streamable HTTP transports.
- 20+ lifecycle hooks (`PreToolUse`, `PostToolUse`, `SessionStart`, `PreCompact`, `TaskCompleted`, …).
- Automatic retry with exponential backoff on 429 / 5xx / network errors.
- LRU file cache, conversation compaction, structured streaming, per-token cost tracking.
- Skill system for reusable prompt + tool bundles.

## Roadmap

| Feature                          | Status | Notes                                                                 |
| -------------------------------- | :----: | --------------------------------------------------------------------- |
| Terminal UI engine               |   ✅   | Ink 4 + React 18 interactive TUI, 13 views, bilingual (zh / en)        |
| Standalone Agent SDK             |   ✅   | 32 tools, 5 skills, MCP (stdio/SSE/HTTP), 20+ hooks, sessions          |
| Multi-LLM provider support       |   ✅   | 19 first-class providers + LiteLLM registry for hundreds more          |
| Three-layer Repo Map             |   ✅   | Directory tree → core signatures → module details                      |
| Symbol-level incremental cache   |   ✅   | AST hash; unchanged files skipped instantly                            |
| Multi-language AST parsing       |   ✅   | 14 languages: TS/JS, Vue, Go, Python, Rust, Java, C/C++, C#, Ruby, Swift, Kotlin, PHP |
| Parallel Wiki generation engine  |   ✅   | `p-limit`-scheduled fan-out, configurable concurrency                  |
| Diff-aware Wiki sync             |   ✅   | Tags pages as `new` / `updated` / `unchanged` / `archived`             |
| In-TUI configuration management  |   ✅   | Add/remove providers and keys without editing config files            |
| Local web preview server         |   ✅   | React 19 + Vite + Tailwind v4, Mermaid, code highlighting, dark mode  |
| Cost tracking                    |   ✅   | Live per-model token / cost meter during generation                    |
| CI integration                   |   ☐    | GitHub Action for auto-sync on push                                    |
| Custom Rules & Skills            |   ☐    | Bring your own writing style and team conventions                      |
| Hosted preview                   |   ☐    | One-click publish generated Wiki to a hosted URL                       |

## FAQ

<details>
<summary><strong>How much does a typical run cost?</strong></summary>

For a ~30k-LOC TypeScript repo using DeepSeek V3, a full generation usually lands under $0.20. Subsequent sync runs are typically under $0.05 thanks to the symbol cache. Costs scale roughly linearly with the number of Wiki pages, not LOC.
</details>

<details>
<summary><strong>Does my code get uploaded anywhere?</strong></summary>

Only to the LLM provider you chose. Open Zread itself runs entirely locally — no telemetry, no servers, no third parties beyond your selected LLM endpoint.
</details>

<details>
<summary><strong>Can I use it in CI?</strong></summary>

Yes — the CLI is non-interactive when invoked with a fully populated config. Wrap it in a GitHub Action that triggers on push to main and commits the regenerated Wiki back. Native CI integration is on the roadmap.
</details>

<details>
<summary><strong>What if my codebase mixes languages?</strong></summary>

Open Zread parses everything it has a grammar for and skips the rest. Pages for mixed-language modules will reference all files but only render structural details for supported languages.
</details>

<details>
<summary><strong>Can I customize the Wiki style or structure?</strong></summary>

The blueprint Agent currently uses bundled prompts. Custom Rules & Skills support is on the roadmap — you'll be able to inject team conventions, tone guidelines, and section templates.
</details>

<details>
<summary><strong>Where are my API keys stored?</strong></summary>

In `~/.zread/config.yaml` as plain YAML. They never leave your machine except to call the provider you configured. Treat the file as a secret — `chmod 600` it if you share the machine.
</details>

## Contributing

Open Zread is iterating quickly. Issues, PRs, new language parsers, and feedback are all welcome.

> [!TIP]
> First time? Good places to start: add a tree-sitter language (`packages/repo-analyzer/src/parser/language-map.ts`), add a Provider to the registry, ship a new bundled Skill, or improve the i18n catalog under `apps/cli/src/i18n/translations/`.

```bash
git clone https://github.com/bb-boy680/open-zread.git
cd open-zread
bun install
bun run dev
```

If this saved you some time, a ⭐ on GitHub is the best way to say thanks.
