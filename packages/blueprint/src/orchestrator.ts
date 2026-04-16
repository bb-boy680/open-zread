/**
 * Blueprint Orchestrator
 *
 * Coordinates single Blueprint Agent to generate wiki.json blueprint.
 */

import { createAgent, getAllBaseTools, type SDKMessage, type AgentDefinition } from '@open-zread/agent';
import { logger, getProjectRoot, loadConfig } from '@open-zread/core';
import { getAllBlueprintTools } from './tools/index.js';
import { BlueprintAgentDefinition, BLUEPRINT_AGENT_NAME } from './agents/index.js';
import type { BlueprintOptions, BlueprintResult, CoreModules } from './types.js';

/**
 * Generate Wiki Blueprint
 *
 * Uses single Blueprint Agent with Repo Map as input.
 * All LLM config is loaded from ~/.zread/config.yaml - no fallbacks.
 *
 * @param options - Blueprint generation options (projectRoot, language, debug only)
 * @returns BlueprintResult with output path and metadata
 */
export async function generateBlueprint(options?: BlueprintOptions): Promise<BlueprintResult> {
  const startTime = performance.now();
  const projectRoot = options?.projectRoot || getProjectRoot();
  const language = options?.language || 'zh';

  // Load config from ~/.zread/config.yaml - REQUIRED
  const config = await loadConfig();

  // Extract LLM config
  const model = config.llm.model;
  const apiKey = config.llm.api_key;
  const baseURL = config.llm.base_url;
  const apiType = config.llm.provider === 'anthropic' ? 'anthropic-messages' : 'openai-completions';
  const maxTurns = 30;  // 三层 Repo Map 需要更多轮次

  logger.info(`开始生成 Wiki 蓝图: ${projectRoot}`);
  logger.info(`模型: ${model}, API: ${apiType}, Base URL: ${baseURL}`);

  // Assemble all tools
  const blueprintTools = getAllBlueprintTools();
  const baseTools = getAllBaseTools();
  const allTools = [...baseTools, ...blueprintTools];

  // Register single agent definition
  const agents: Record<string, AgentDefinition> = {
    [BLUEPRINT_AGENT_NAME]: BlueprintAgentDefinition,
  };

  // Create agent with LLM config
  const agent = createAgent({
    model,
    apiType,
    apiKey,
    baseURL,
    cwd: projectRoot,
    tools: allTools,
    maxTurns,
    agents,
    permissionMode: 'bypassPermissions',
  });

  // Main prompt for single agent
  const mainPrompt = buildSingleAgentPrompt(language);

  let outputPath = '';
  let coreModules: CoreModules | undefined;

  // Execute agent
  try {
    for await (const event of agent.query(mainPrompt)) {
      const msg = event as SDKMessage;

      // Log progress
      if (msg.type === 'assistant') {
        for (const block of (msg as any).message?.content || []) {
          if (block.type === 'tool_use') {
            const toolName = block.name;
            const toolInput = JSON.stringify(block.input || {});
            logger.progress(`[${toolName}]`, toolInput);
          }
          if (block.type === 'text' && block.text) {
            logger.info(block.text);
          }
        }
      }

      if (msg.type === 'tool_result') {
        const result = (msg as any).result;
        logger.info(`[Tool Result: ${result.tool_name}] ${result.output}`);

        // Try to parse structured output
        try {
          const output = JSON.parse(result.output);
          if (result.tool_name === 'get_core_signatures') {
            if (output.coreFiles) {
              coreModules = {
                coreModules: output.coreFiles.map((f: string) => ({
                  name: f.split('/').pop() || f,
                  files: [f],
                  reason: '高频引用文件',
                })),
                moduleGroups: {},
              };
            }
          }
        } catch {
          // Not JSON output, skip
        }
      }

      if (msg.type === 'result') {
        const result = msg as any;
        if (result.subtype === 'success') {
          logger.success('蓝图生成完成');
          if (result.result?.includes('Blueprint generated')) {
            outputPath = result.result.match(/Blueprint generated: (.+)/)?.[1] || '';
          }
        } else {
          logger.error(`蓝图生成失败: ${result.subtype}`);
          if (result.errors) {
            for (const err of result.errors) {
              logger.error(err);
            }
          }
        }
      }
    }
  } catch (err: any) {
    logger.error(`Agent 执行错误: ${err.message}`);
    throw err;
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    outputPath,
    pagesCount: 0,
    coreModules,
    durationMs,
  };
}

/**
 * Build prompt for single Blueprint Agent
 */
function buildSingleAgentPrompt(language: 'zh' | 'en'): string {
  const langNote = language === 'zh'
    ? 'Wiki 标题使用中文，slug 使用英文'
    : 'Wiki titles and slugs use English';

  return `
请生成 Wiki 蓝图。

## 三层 Repo Map 工具

使用以下三层工具递进分析项目：

### Layer 1: get_directory_tree
获取纯目录结构树（无符号）。Token 消耗极低。
用于建立全局模块框架。

### Layer 2: get_core_signatures
获取核心文件签名（Ref >= 5）。仅显示导出签名。
用于理解核心 API 边界。

### Layer 3: get_module_details
获取指定模块的完整详情。
用于深入分析某个模块的实现。

## 执行步骤

### Step 1: 建立全局框架
调用 \`get_directory_tree\` 获取目录树。
识别 packages/ 下所有子目录（每个都是一个潜在模块）。

### Step 2: 理解核心 API
调用 \`get_core_signatures\` 获取核心签名。
识别高引用文件，理解核心模块优先级。

### Step 3: 深入模块分析
对每个确认需要章节的模块，调用 \`get_module_details\` 获取完整详情。
理解模块内部结构，确定章节标题和关联文件。

### Step 4: 生成蓝图
调用 \`generate_blueprint\` 保存 wiki.json。

### Step 5: 验证
调用 \`validate_blueprint\` 验证关联文件是否存在。

## 重要说明
- ${langNote}
- 三层递进：先全局（Layer 1）→ 核心边界（Layer 2）→ 模块细节（Layer 3）
- 每个 packages/ 子目录都应有章节
- 章节标题应体现模块功能（如 "Agent SDK" 而非 "核心模块2"）
`;
}

// Re-export types
export type { BlueprintOptions, BlueprintResult } from './types.js';