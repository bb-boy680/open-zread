/**
 * Agent 工具函数
 *
 * 类型守卫和常量配置。
 */

import type { SDKMessage, SDKAssistantMessage, SDKToolResultMessage, SDKResultMessage, SDKPartialMessage } from '@open-zread/agent-sdk';

/** Type guard for partial message (streaming) */
export function isPartialMessage(msg: SDKMessage): msg is SDKPartialMessage {
  return msg.type === 'partial_message';
}

/** Type guard for SDKAssistantMessage */
export function isAssistantMessage(msg: SDKMessage): msg is SDKAssistantMessage {
  return msg.type === 'assistant';
}

/** Type guard for SDKToolResultMessage */
export function isToolResultMessage(msg: SDKMessage): msg is SDKToolResultMessage {
  return msg.type === 'tool_result';
}

/** Type guard for SDKResultMessage */
export function isResultMessage(msg: SDKMessage): msg is SDKResultMessage {
  return msg.type === 'result';
}

/** 系统提示词 — 根据 doc_language 规定 Wiki 输出语种 */
export const SYSTEM_PROMPTS: Record<'zh' | 'en', string> = {
  zh: `【强制语言规则】你的系统语言是中文。

**你必须严格遵守以下规则：**
1. 所有回复、分析、思考过程必须使用中文
2. 生成的所有内容（包括 wiki.json 的 title、section、描述文字等）必须使用中文
3. 即使用户提示词是英文，你也必须用中文输出
4. 即便代码注释或文档原文是英文，你的输出也必须是中文
5. 这是一个强制约束，没有任何例外情况

违反此规则将导致任务失败。`,
  en: `【Mandatory Language Rule】Your system language is English.

**You must strictly follow these rules:**
1. All replies, analysis, and thinking processes must be in English
2. All generated content (including wiki.json title, section, descriptions) must be in English
3. Even if the user prompt is in another language, you must output in English
4. This is a mandatory constraint with no exceptions

Violation of this rule will result in task failure.`,
};