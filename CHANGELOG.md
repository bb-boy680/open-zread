# Changelog

All notable changes to Open Zread will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-29

### Added

- **CLI Terminal UI** — Full interactive Ink-based interface with menus, forms, and real-time progress
- **Three-Layer Repo Map Architecture** — Progressive analysis: directory tree → core signatures → module details
- **Orchestrator Agent** — LLM-powered agent with 30+ tools for wiki generation
- **20+ LLM Provider Support** — Anthropic, OpenAI, DeepSeek, Google Gemini, OpenRouter, and 15+ more
- **Incremental Processing** — Symbol-level caching with hash-based change detection
- **Multi-Language Output** — Configurable UI and document language (Chinese, English, etc.)
- **web-tree-sitter Parser** — AST-based code analysis across multiple languages
- **Agent SDK** — Complete agent framework with MCP server integration, context compaction, and retry logic
- **Turbo Monorepo Build** — Parallel builds with tsup (ESM, minified, cross-platform)
- **Config Management UI** — In-terminal configuration editing for LLM providers, concurrency, and retries
- **Wiki Blueprint Validation** — Automated verification of associated files and directories

### Tech

- Bun 1.3.0 runtime
- TypeScript 5.0+ strict mode
- Turbo 2.x + tsup build pipeline
- Ink 4.x + React 18 for terminal UI
- Zustand + use-immer for state management
