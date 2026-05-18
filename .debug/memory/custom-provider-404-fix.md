---
title: custom provider 配置被忽略导致 404 错误
description: 配置中 provider 字段未传递给 SDK，且 base_url 中的 /anthropic 路径检测优先级低于 providerId
time: 2026-05-19 01:51
---

**调用堆栈**：config.llm.provider → create-agent.ts 提取配置 → Agent 构造函数 → extractProviderId() → createProvider()
**BUG 症状**：
- **用户描述的问题**：使用 `provider: custom` 配置时报 404 错误，API 调用失败
- **正确现象**：SDK 应根据 provider 和 base_url 自动选择正确的 API 格式（Anthropic 或 OpenAI-compatible）
**错误源头**：create-agent.ts 只传递 model/apiKey/baseURL，未传递 provider；Agent.extractProviderId() 的 `??` 短路运算导致 providerId 有值时不检查 base_url
**正确性假设**：
1. 配置中 `provider: custom` 应映射到 OpenAI-compatible API 格式
2. base_url 包含 `/anthropic` 时应自动使用 Anthropic API 格式，优先级高于显式 providerId
**修复方式**：
```diff
--- a/packages/agent-sdk/src/providers/index.ts
+++ b/packages/agent-sdk/src/providers/index.ts
@@ PROVIDER_ID_TO_API_TYPE 映射
+  'custom': 'openai-completions',

--- a/packages/orchestrator/src/agents/create-agent.ts
+++ b/packages/orchestrator/src/agents/create-agent.ts
@@ 第 59-61 行
   const model = config.llm.model ?? undefined;
   const apiKey = config.llm.api_key ?? undefined;
   const baseURL = config.llm.base_url ?? undefined;
+  const providerId = config.llm.provider ?? undefined;

@@ 第 126-129 行
   const agent = CreateAgentSdk({
     model,
     apiKey,
     baseURL,
+    providerId,
     cwd: process.cwd(),

--- a/packages/agent-sdk/src/agent.ts
+++ b/packages/agent-sdk/src/agent.ts
@@ 第 75 行
-    this.providerId = this.cfg.providerId ?? this.extractProviderId()
+    this.providerId = this.extractProviderId()

@@ extractProviderId() 方法顺序
-    // Explicit providerId option
-    if (this.cfg.providerId) return this.cfg.providerId
-    // Check baseURL for endpoint format first
+    // Check baseURL for endpoint format first (Anthropic-compatible endpoints)
+    // This takes priority because the endpoint format determines API compatibility
     const baseUrl = this.apiCredentials.baseUrl?.toLowerCase() || ''
     if (baseUrl.includes('/anthropic')) return 'anthropic'
+    // Explicit providerId option (respected when baseURL doesn't indicate format)
+    if (this.cfg.providerId) return this.cfg.providerId
```
**关键教训**：
1. `??` 短路运算符会跳过后续逻辑，当需要在两种选择间做智能决策时，应封装为方法统一处理
2. API 端点格式（Anthropic vs OpenAI）应由 base_url 路径决定，而非仅依赖 provider 名称
3. 配置传递时遗漏字段是常见错误，应检查所有配置项是否都被正确使用
**修复结果**：现在 SDK 会优先检查 base_url 是否包含 `/anthropic`，自动选择正确的 API 格式。用户配置 `provider: custom` + `base_url: .../anthropic` 时，SDK 会正确使用 Anthropic API 格式。