/**
 * createBlueprintAgent - 通用 Blueprint Agent 创建方法
 *
 * 封装逻辑：
 * - 加载 config 配置（model, apiKey, baseURL, apiType）
 * - 创建 Agent 并执行提示词
 * - 处理执行过程中的日志和结果解析
 * - 支持进度回调（通过钩子机制）
 * - LLM API 错误重试（rate limit、timeout、overloaded）
 */

import { createAgent as CreateAgentSdk, type SDKMessage, type TokenUsage, type ToolDefinition } from '@open-zread/agent-sdk';
import { loadConfig, logger } from '@open-zread/utils';
import type { CatalogEvent, CoreModules } from '../types.js';
import { isAssistantMessage, isPartialMessage, isResultMessage, isToolResultMessage, LANGUAGE_NOTES } from './uitls.js';

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
  /** 最大重试次数（LLM API 错误） */
  maxRetries?: number;
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
  /** 重试次数 */
  retryCount?: number;
}

/**
 * LLM API 可重试的错误状态码
 */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 529];

/**
 * 检查错误是否可重试
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status;
    if (status && RETRYABLE_STATUS_CODES.includes(status)) {
      return true;
    }
    // 网络错误
    const code = (err as Error & { code?: string }).code;
    if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
      return true;
    }
    // API overloaded
    const msg = err.message.toLowerCase();
    if (msg.includes('overloaded') || msg.includes('rate limit')) {
      return true;
    }
  }
  return false;
}

/**
 * 计算重试延迟（指数退避）
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = 2000;
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = delay * 0.25 * Math.random();
  return Math.min(delay + jitter, 30000);
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
  const maxRetries = options.maxRetries ?? 3;

  // 加载配置
  const config = await loadConfig();

  const language = config.language as 'zh' | 'en';

  // 提取 LLM 配置（null → undefined，SDK 不接受 null）
  const model = config.llm.model ?? undefined;
  const apiKey = config.llm.api_key ?? undefined;
  const baseURL = config.llm.base_url ?? undefined;

  // 验证必需配置
  if (!model || !apiKey || !baseURL) {
    throw new Error('LLM configuration incomplete. Please run `open-zread config` to configure.');
  }

  logger.info(`模型: ${model}, baseURL: ${baseURL}`);

  // Token 累积统计
  let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };
  let retryCount = 0;

  // 重试循环
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 构建钩子配置（如果有 onEvent 回调）
    const onEvent = options.onEvent;
    const hooks = onEvent ? {
      PreToolUse: [{
        hooks: [
          async (input: Record<string, unknown>) => {
            onEvent({
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
            onEvent({
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
      apiKey,
      baseURL,
      cwd: process.cwd(),
      tools: options.tools,
      systemPrompt: LANGUAGE_NOTES[language],
      maxTurns: options?.maxTurns ?? 30,
      permissionMode: 'bypassPermissions',
      hooks,
      includePartialMessages: true,
    });

    let outputPath = '';
    let coreModules: CoreModules | undefined;

    try {
      // 发送开始事件
      options.onEvent?.({ type: 'requesting', usage: totalUsage });

      for await (const event of agent.query(options.prompts)) {
        const msg = event as SDKMessage;

        // Partial 流式输出
        if (isPartialMessage(msg)) {
          options.onEvent?.({ type: 'responding', usage: totalUsage });
        }

        // Log progress
        if (isAssistantMessage(msg)) {
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
          if (msg.usage) {
            totalUsage = msg.usage;
          }

          if (msg.subtype === 'success') {
            if (msg.result?.includes('Blueprint generated')) {
              outputPath = msg.result.match(/Blueprint generated: (.+)/)?.[1] || '';
            }
            options.onEvent?.({
              type: 'complete',
              outputPath,
              usage: totalUsage,
              durationMs: Math.round(performance.now() - startTime),
            });

            return {
              outputPath,
              coreModules,
              durationMs: Math.round(performance.now() - startTime),
              tokenUsage: totalUsage,
              retryCount,
            };
          } else {
            const errors = msg.errors?.join('\n') || msg.subtype;
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
            throw new Error(errors);
          }
        }
      }

      // 如果成功完成，返回结果
      return {
        outputPath,
        coreModules,
        durationMs: Math.round(performance.now() - startTime),
        tokenUsage: totalUsage,
        retryCount,
      };

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(errorMsg);

      // 检查是否可重试
      if (isRetryableError(err) && attempt < maxRetries) {
        retryCount++;
        const delay = getRetryDelay(attempt);
        logger.warn(`API 错误，${delay / 1000}秒后重试 (${attempt + 1}/${maxRetries}): ${errorMsg}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 不可重试或已达最大重试次数
      logger.error(`Agent 执行错误: ${errorMsg}`);
      options.onEvent?.({
        type: 'error',
        error: errorMsg,
        durationMs: Math.round(performance.now() - startTime),
      });
      throw err;
    }
  }

  // 所有重试都失败
  throw lastError;
}