/**
 * Config Editor Field Definitions
 */

import type { FieldDef } from './types';

export const FIELDS: FieldDef[] = [
  {
    key: 'language',
    label: '请选择界面语言',
    type: 'select',
    defaultValue: 'zh',
    options: [
      { label: 'English', value: 'en' },
      { label: '中文', value: 'zh' },
    ],
  },
  {
    key: 'doc_language',
    label: '文档生成语言',
    type: 'select',
    defaultValue: 'zh',
    options: [
      { label: 'English', value: 'en' },
      { label: '中文', value: 'zh' },
    ],
  },
  {
    key: 'llm.provider',
    label: 'LLM 提供商',
    type: 'select',
    defaultValue: 'custom',
  },
  {
    key: 'concurrency.max_concurrent',
    label: '最大并发数',
    type: 'number',
    defaultValue: '1',
    helpText: '(默认: 1)',
  },
  {
    key: 'concurrency.max_retries',
    label: '最大重试次数',
    type: 'number',
    defaultValue: '0',
    helpText: '(默认: 0)',
  },
];

/**
 * Flatten AppConfig into a Record<string, string>.
 */
export function flattenConfig(config: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of FIELDS) {
    const parts = field.key.split('.');
    let val: unknown = config;
    for (const part of parts) {
      val = (val as Record<string, unknown>)?.[part];
    }
    result[field.key] = val !== undefined && val !== null ? String(val) : '';
  }
  return result;
}

/**
 * Reconstruct AppConfig from flattened values.
 */
export function unflattenConfig(
  values: Record<string, string>,
  originalConfig?: Record<string, unknown>,
): Record<string, unknown> {
  const existingLlm = (originalConfig?.llm || {}) as Record<string, unknown>;
  return {
    language: values['language'] || 'zh',
    doc_language: values['doc_language'] || 'zh',
    llm: {
      provider: values['llm.provider'] || 'custom',
      model: existingLlm.model ?? 'glm-5',
      api_key: existingLlm.api_key ?? '',
      base_url: existingLlm.base_url ?? '',
    },
    concurrency: {
      max_concurrent: parseInt(values['concurrency.max_concurrent'], 10) || 1,
      max_retries: parseInt(values['concurrency.max_retries'], 10) || 0,
    },
  };
}
