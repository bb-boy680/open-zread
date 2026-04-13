import type { AppConfig } from '@open-zread/types';
import { stream, Context, Model } from '@mariozechner/pi-ai';
import { logger, getProjectRoot } from '@open-zread/core';
import { join } from 'path';
import { appendFileSync, mkdirSync, existsSync } from 'fs';

let agentLogPath: string | null = null;

function getAgentLogPath(): string {
  if (agentLogPath) return agentLogPath;
  const projectRoot = getProjectRoot();
  const logDir = join(projectRoot, '.open-zread', 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  agentLogPath = join(logDir, 'agent-debug.log');
  return agentLogPath;
}

export function appendAgentLog(content: string): void {
  try {
    appendFileSync(getAgentLogPath(), content + '\n', 'utf-8');
  } catch {
    // Silent fail for debug log
  }
}

function resolveProvider(config: AppConfig): string {
  const hostname = new URL(config.llm.base_url).hostname;

  if (hostname === 'api.openai.com') return 'openai';
  if (hostname === 'api.anthropic.com') return 'anthropic';
  if (hostname === 'generativelanguage.googleapis.com') return 'google';

  return 'openai';
}

function buildModel(config: AppConfig): Model<'openai-completions'> {
  const provider = resolveProvider(config);

  return {
    id: config.llm.model,
    name: config.llm.model,
    api: 'openai-completions',
    provider: provider,
    baseUrl: config.llm.base_url,
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 4000
  };
}

function buildContext(prompt: string, systemPrompt?: string): Context {
  const context: Context = { messages: [] };

  if (systemPrompt) {
    context.systemPrompt = systemPrompt;
  }

  context.messages.push({
    role: 'user',
    content: prompt,
    timestamp: Date.now()
  });

  return context;
}

export async function callLLM(
  config: AppConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const model = buildModel(config);
  const context = buildContext(prompt, systemPrompt);

  const startTime = Date.now();
  const callId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  logger.info(`Calling LLM: ${config.llm.model}`);
  logger.info(`  Provider: ${model.provider}`);
  logger.info(`  Base URL: ${config.llm.base_url}`);

  const debugHeader = `\n${'='.repeat(60)}\nCALL #${callId} | ${config.llm.model} | ${new Date().toISOString()}\n${'='.repeat(60)}\n\n--- SYSTEM PROMPT ---\n${systemPrompt || '(none)'}\n\n--- USER PROMPT ---\n${prompt}\n`;
  appendAgentLog(debugHeader);

  try {
    const s = stream(model, context, { apiKey: config.llm.api_key });
    let fullContent = '';
    let lastLogTime = Date.now();

    for await (const event of s) {
      if (event.type === 'text_delta') {
        fullContent += event.delta;
        const now = Date.now();
        if (now - lastLogTime > 2000) {
          logger.info(`  Streaming... ${fullContent.length} chars (${((now - startTime) / 1000).toFixed(1)}s)`);
          lastLogTime = now;
        }
      }
    }

    const result = await s.result();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.success(`LLM response received (${result.usage.output} tokens, ${elapsed}s)`);

    appendAgentLog(`\n--- RESPONSE (${result.usage.output} tokens, ${elapsed}s) ---\n${fullContent}\n`);

    return fullContent;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const errMsg = `\n--- ERROR after ${elapsed}s ---\n${error}\n`;
    appendAgentLog(errMsg);
    logger.error(`LLM call failed after ${elapsed}s: ${error}`);
    throw error;
  }
}

function extractFirstJson(text: string): string | null {
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (markdownMatch) {
    const inner = markdownMatch[1].trim();
    const start = inner.indexOf('{');
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < inner.length; i++) {
        if (inner[i] === '{') depth++;
        if (inner[i] === '}') depth--;
        if (depth === 0) return inner.slice(start, i + 1);
      }
    }
  }

  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

export function parseJsonResponse(response: string): unknown {
  const json = extractFirstJson(response);
  if (!json) {
    throw new Error('No JSON found in response');
  }

  try {
    return JSON.parse(json);
  } catch {
    throw new Error('JSON parse failed');
  }
}
