/**
 * 中文翻译字典
 */

import type { TranslationKeys } from '../types';

export const zhCN: TranslationKeys = {
  config: {
    title: 'Zread — 编辑配置',
    selectLanguage: '界面语言',
    docLanguage: '文档生成语言',
    llmProvider: 'LLM 提供商',
    maxConcurrency: '最大并发数',
    maxRetries: '最大重试次数',
    default: '(默认: {default})',
    footer: 'ESC 退出 | ↑↓ 选择 | Enter 确认 | s 保存',
    saved: '配置已保存',
    saveFailed: '保存失败',
    hasUnsavedChanges: '有未保存的修改',
    pressS: '按 s 保存',
    current: '当前值',
    range: '范围',
    invalidRange: '输入超出范围',
  },
  language: {
    select: '选择界面语言',
    zh: '中文',
    en: '英文',
    current: '当前',
    footer: 'ESC 返回 | ↑↓ 选择 | Enter 确认并返回 | s 保存并返回',
  },
  docLanguage: {
    select: '选择文档生成语言',
    zh: '中文',
    en: '英文',
    current: '当前',
    footer: 'ESC 返回 | ↑↓ 选择 | Enter 确认并返回 | s 保存并返回',
  },
  provider: {
    select: '选择 LLM 提供商',
  },
  concurrency: {
    set: '设置最大并发数',
    range: '范围: 1-10',
    invalid: '请输入 1-10 之间的整数',
    current: '当前值',
    footer: 'ESC 返回 | Enter 确认 | s 保存并返回',
  },
  retry: {
    set: '设置最大重试次数',
    range: '范围: 0-5',
    invalid: '请输入 0-5 之间的整数',
    current: '当前值',
    footer: 'ESC 返回 | Enter 确认 | s 保存并返回',
  },
  common: {
    escBack: 'ESC 返回',
    saveAndBack: 's 保存并返回',
  },
  divider: {
    prefix: '── ',
    middle: ' ─',
  },
};