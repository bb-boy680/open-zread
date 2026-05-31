# @open-zread/cli

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
