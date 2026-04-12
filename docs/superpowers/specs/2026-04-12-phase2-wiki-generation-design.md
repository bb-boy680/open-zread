---
name: Phase 2 Wiki Generation Design
type: design
date: 2026-04-12
---

# Phase 2: Wiki 文档生成系统设计

## 概述

Phase 2 读取 Phase 1 产出的 `.open-zread/drafts/wiki.json` 蓝图，针对每一页调用 WriterAgent 生成高质量 Markdown 文档，最终写入 `.open-zread/wiki/current/`。

## 关键决策汇总

### 1. 页面分类 + 动态模板

wiki.json 的 `WikiPage` 增加 `type` 字段，分 5 类：

| 类型 | 值 | 示例页面 | 侧重 |
|------|-----|---------|------|
| 概览型 | `overview` | 项目概述、技术栈 | Why/What，少代码 |
| 架构型 | `architecture` | 架构总览、数据流水线 | Mermaid 图、模块调用链 |
| 代码型 | `code` | 代码转换引擎、摄取管道 | 核心符号、源码片段 |
| 规范型 | `spec` | 编码规范、测试指南 | Checklist、规则列表 |
| 参考型 | `reference` | API 参考、CLI 命令 | Markdown 表格 |

WriterAgent 采用 **策略调度器 (Strategy Dispatcher)**：1 个 Base System Prompt + 5 个 Type Prompt 插件，按 `page.type` 选择。

### 2. 增量更新：骨架 Hash 语义判定

利用 Dehydrator 已有的中间产物做两层过滤：

1. **文件 Hash 比对** — `associatedFiles` 的 rawHash 完全一致 → 直接跳过
2. **骨架 Hash 比对** — rawHash 变了但 skeletonHash 未变 → 跳过（说明只是实现细节变更，接口/签名/注释未变）

`CacheManifest` 增加 `skeletonHash` 字段：
```typescript
{
  path: string;
  hash: string;        // rawHash
  skeletonHash: string; // 骨架字符串的 MD5
  size: number;
}
```

特殊情况：
- Prompt 模板或 Config 变更 → 全量重写（通过 `promptHash` 感知）
- `--force` 参数 → 绕过所有 Hash 检查，强制全量重写

### 3. Wiki 存储路径

统一归口到 `.open-zread/wiki/`：

```
.open-zread/
├── cache/           ← 缓存快照
├── drafts/          ← wiki.json 蓝图
├── wiki/
│   ├── current/     ← 当前生效的 .md
│   ├── versions/    ← 历史快照 (YYYY-MM-DD_HHmm_commitHash/)
│   └── drafts/      ← 正在生成的中间态
└── logs/
```

每次 generate 成功：旧 `current/` 整体移动到 `versions/YYYY-MM-DD_HHmm_commitHash/`，新产物写入 `current/`。历史快照无限保留。

### 4. 并发生成策略

- **并发数** 由 `~/.zread/config.yaml` 的 `concurrency.max_concurrent` 控制
- **重试次数** 由 `concurrency.max_retries` 控制
- 使用 `p-limit` 或手动信号量控制并发池
- 自动重试：每页失败后最多重试 `max_retries` 次，全部失败后标记 `failed`，其余页面继续

### 5. CLI 命令

独立命令：`open-zread wiki`

读取 `.open-zread/drafts/wiki.json`，开始并发生成。

### 6. 进度显示

简洁行式，每页一行前缀标记：
```
[✓] 1-project-overview.md
[⊘] 3-environment-setup.md  (跳过，骨架未变)
[✗] 4-cli-commands.md      (API限流，已重试3次)
[5/20] 正在生成: 5-project-structure.md ...
```

### 7. Prompt 模板

硬编码在 TypeScript 中（`packages/writer/src/prompts.ts`），与现有 `packages/agents/src/prompts.ts` 风格一致。

### 8. WriterAgent 上下文加载

WriterManager 按页面类型预组装上下文，一次性注入 WriterAgent。WriterAgent 只负责"写"。

## 新增/修改模块

### 新增: `packages/writer`

```
packages/writer/
├── src/
│   ├── index.ts           ← 导出入口
│   ├── writer-manager.ts  ← 并发调度、上下文预组装、增量判定
│   ├── writer-agent.ts    ← 单页 LLM 调用 + Markdown 生成
│   ├── prompts.ts         ← Base Prompt + 5 Type Prompt 插件
│   └── context-builder.ts ← 根据页面类型组装上下文
└── package.json
```

### 新增: `packages/storage`

```
packages/storage/
├── src/
│   ├── index.ts           ← 导出入口
│   ├── wiki-store.ts      ← .md 读写、版本快照
│   └── versioning.ts      ← current → versions 迁移
└── package.json
```

### 修改: `packages/types`

- `WikiPage` 增加 `type?: string` 字段
- `CacheManifest` 的 files 数组增加 `skeletonHash: string`

### 修改: `packages/agents`

- `outline-agent.ts` 输出中为每个 page 增加 `type` 字段。如果 Phase 1 已产出的 wiki.json 没有 type，WriterManager 在启动时执行一次快速分类兜底

### 修改: `packages/dehydrator`

- 输出骨架字符串时附带计算 `skeletonHash`

### 修改: `cli/src/index.tsx`

- 新增 `wiki` 子命令入口
- 接入 WriterManager，显示行式进度

## 数据流

```
wiki.json (drafts)
       │
       ▼
┌──────────────────────────────────┐
│         WriterManager            │
│  1. 读取 wiki.json               │
│  2. 加载 CacheManifest (含skeletonHash) │
│  3. 增量判定 (跳过不变页面)        │
│  4. ContextBuilder 预组装上下文    │
│  5. 并发池调度 WriterAgent         │
│  6. Storage 写入 .md              │
│  7. 版本快照 (current → versions)  │
└──────────────────────────────────┘
       │
       ▼
.open-zread/wiki/current/*.md
```
