/**
 * Blueprint Orchestrator
 *
 * Coordinates single Blueprint Agent to generate wiki.json blueprint.
 */

import { createAgent, getAllBaseTools, type SDKMessage, type AgentDefinition } from '@open-zread/agent';
import { logger, getProjectRoot, loadConfig } from '@open-zread/core';
import { getAllBlueprintTools } from './tools/index.js';
import { BlueprintAgentDefinition, BLUEPRINT_AGENT_NAME } from './agents/index.js';
import type { BlueprintOptions, BlueprintResult, TechStackSummary, CoreModules } from './types.js';

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
  const maxTurns = 20;

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
  let techStackSummary: TechStackSummary | undefined;
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
          if (result.tool_name === 'get_repo_map') {
            if (output.topFiles) {
              coreModules = {
                coreModules: output.topFiles.map((f: string) => ({
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
    techStackSummary,
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

## 执行步骤

### Step 1: 获取项目上下文
调用 \`get_repo_map\` 获取 Repo Map（树状结构的项目上下文）。
如果缓存不存在，提示用户先运行 CLI：bun run dev

### Step 2: 分析并生成蓝图
基于 Repo Map 一次性完成：
1. 识别技术栈和项目类型
2. 分析核心模块（引用数 >= 5 的文件）
3. 设计 Wiki 章节结构
4. 调用 \`generate_blueprint\` 保存 wiki.json

### Step 3: 验证
调用 \`validate_blueprint\` 验证关联文件是否存在。

## 重要说明
- ${langNote}
- 优先使用 Repo Map 中的信息，避免重复读取文件
- 核心模块章节标题应体现模块功能
- 章节数量根据项目大小调整（5-20 章）
`;
}

// Re-export types
export type { BlueprintOptions, BlueprintResult } from './types.js';