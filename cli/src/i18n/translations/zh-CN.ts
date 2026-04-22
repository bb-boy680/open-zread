/**
 * 中文翻译字典
 */

import type { TranslationKeys } from '../types';

export const zhCN: TranslationKeys = {
  config: {
    title: 'Zread — 编辑配置',
    selectLanguage: '请选择界面语言：',
    docLanguage: '文档生成语言',
    llmProvider: 'LLM 提供商',
    maxConcurrency: '最大并发数',
    maxRetries: '最大重试次数',
    default: '(默认: {default})',
    footer: 'ESC 退出 | ↑↓ 选择 | Enter 确认',
  },
  language: {
    select: '选择界面语言',
  },
  docLanguage: {
    select: '选择文档生成语言',
  },
  provider: {
    select: '选择 LLM 提供商',
  },
  concurrency: {
    set: '设置最大并发数',
  },
  retry: {
    set: '设置最大重试次数',
  },
  common: {
    escBack: 'ESC 返回',
  },
  divider: {
    prefix: '── ',
    middle: ' ─',
  },
};