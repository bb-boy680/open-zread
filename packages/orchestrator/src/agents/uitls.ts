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

/** 语言配置映射 */
export const LANGUAGE_NOTES: Record<'zh' | 'en', string> = {
  zh: 'Wiki 标题使用中文，slug 使用英文',
  en: 'Wiki titles and slugs use English',
};