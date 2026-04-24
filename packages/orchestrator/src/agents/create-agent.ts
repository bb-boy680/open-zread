/**
 * createBlueprintAgent - 通用 Blueprint Agent 创建方法
 *
 * 封装逻辑：
 * - 加载 config 配置（model, apiKey, baseURL, apiType）
 * - 创建 Agent 并执行提示词
 * - 处理执行过程中的日志和结果解析
 * - 支持进度回调（通过钩子机制）
 */

import { createAgent as CreateAgentSdk, getAllBaseTools, type ToolDefinition, type SDKMessage, type TokenUsage } from '@open-zread/agent-sdk';
import { loadConfig, logger } from '@open-zread/utils';
import { isAssistantMessage, isToolResultMessage, isResultMessage, isPartialMessage, LANGUAGE_NOTES } from './uitls.js';
import type { CoreModules, CatalogEvent } from '../types.js';

/**
 * 创建 Blueprint Agent 的选项
 */
export interface CreateBlueprintAgentOptions {
  /** 自定义工具（会与 baseTools 合并） */
  tools: ToolDefinition[];
  /** 执行提示词 */
  prompts: string;
  /** 最大轮次 */
  maxTurns?: number;
  /** 进度回调（可选） */
  onEvent?: (event: CatalogEvent) => void;
}

/**
 * 执行结果
 */
export interface AgentResult {
  /** 输出文件路径 */
  outputPath: string;
  /** 核心模块信息 */
  coreModules: CoreModules | undefined;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** Token 使用统计 */
  tokenUsage?: TokenUsage;
}

/**
 * 创建并执行 Blueprint Agent
 *
 * 自动加载配置、创建 Agent、执行提示词并返回结果。
 * 支持通过 onEvent 回调实时传递进度事件。
 *
 * @param options - 创建选项
 * @returns 执行结果
 */
export async function createAgent(options: CreateBlueprintAgentOptions): Promise<AgentResult> {
  const startTime = performance.now();

  // 加载配置
  const config = await loadConfig();
  const language = config.language as 'zh' | 'en';

  // 提取 LLM 配置
  const model = config.llm.model;
  const apiKey = config.llm.api_key;
  const baseURL = config.llm.base_url;
  const apiType = config.llm.provider === 'anthropic'
    ? 'anthropic-messages'
    : 'openai-completions';

  // 合并工具：baseTools + 自定义工具
  const baseTools = getAllBaseTools();
  const allTools = [...baseTools, ...options.tools];

  // Token 累积统计
  let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  logger.info(`模型: ${model}, API: ${apiType}`);

  // 构建钩子配置（如果有 onEvent 回调）
  const hooks = options.onEvent ? {
    PreToolUse: [{
      hooks: [
        async (input: Record<string, unknown>) => {
          options.onEvent!({
            type: 'tool_start',
            toolName: input.toolName as string,
            toolInput: JSON.stringify(input.toolInput || {}).slice(0, 100),
            usage: totalUsage,
          });
        },
      ],
    }],
    PostToolUse: [{
      hooks: [
        async (input: Record<string, unknown>) => {
          options.onEvent!({
            type: 'tool_result',
            toolName: input.toolName as string,
            output: String(input.toolOutput || '').slice(0, 200),
            usage: totalUsage,
          });
        },
      ],
    }],
  } : undefined;

  // 创建 Agent
  const agent = CreateAgentSdk({
    model,
    apiType,
    apiKey,
    baseURL,
    cwd: process.cwd(),
    tools: allTools,
    systemPrompt: LANGUAGE_NOTES[language],
    maxTurns: options?.maxTurns ?? 30,
    permissionMode: 'bypassPermissions',
    hooks,
    includePartialMessages: true,
  });

  let outputPath = '';
  let coreModules: CoreModules | undefined;

  // Execute agent
  try {
    // 发送开始事件（传递累计 usage）
    options.onEvent?.({ type: 'requesting', usage: totalUsage });

    for await (const event of agent.query(options.prompts)) {
      const msg = event as SDKMessage;

      // Partial 流式输出（传递累计 usage）
      if (isPartialMessage(msg)) {
        options.onEvent?.({ type: 'responding', usage: totalUsage });
      }

      // Log progress
      if (isAssistantMessage(msg)) {
        // 从 assistant 消息更新累计 Token
        if (msg.usage) {
          totalUsage = msg.usage;
        }

        for (const block of msg.message?.content || []) {
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

      if (isToolResultMessage(msg)) {
        const result = msg.result;
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

      if (isResultMessage(msg)) {
        // 更新累计 Token（每次 API 响应后）
        if (msg.usage) {
          totalUsage = msg.usage;
        }

        if (msg.subtype === 'success') {
          logger.success('蓝图生成完成');
          if (msg.result?.includes('Blueprint generated')) {
            outputPath = msg.result.match(/Blueprint generated: (.+)/)?.[1] || '';
          }
          // 发送完成事件
          options.onEvent?.({
            type: 'complete',
            outputPath,
            usage: totalUsage,
            durationMs: Math.round(performance.now() - startTime),
          });
        } else {
          logger.error(`蓝图生成失败: ${msg.subtype}`);
          const errors = msg.errors?.join('\n') || msg.subtype;
          // 发送错误事件
          options.onEvent?.({
            type: 'error',
            error: errors,
            durationMs: Math.round(performance.now() - startTime),
          });
          if (msg.errors) {
            for (const err of msg.errors) {
              logger.error(err);
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Agent 执行错误: ${message}`);
    // 发送错误事件
    options.onEvent?.({
      type: 'error',
      error: message,
      durationMs: Math.round(performance.now() - startTime),
    });
    throw err;
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    outputPath,
    coreModules,
    durationMs,
    tokenUsage: totalUsage,
  };
}