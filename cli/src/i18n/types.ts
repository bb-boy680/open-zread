/**
 * i18n 类型定义
 */

/** 支持的语言代码 */
export type LanguageCode = 'zh-CN' | 'en-US';

/** 翻译字典结构 */
export interface TranslationKeys {
  config: {
    title: string;
    selectLanguage: string;
    docLanguage: string;
    llmProvider: string;
    maxConcurrency: string;
    maxRetries: string;
    default: string;
    footer: string;
    saved: string;
    saveFailed: string;
    hasUnsavedChanges: string;
    pressS: string;
    current: string;
    range: string;
    invalidRange: string;
  };
  language: {
    select: string;
    zh: string;
    en: string;
    current: string;
    footer: string;
  };
  docLanguage: {
    select: string;
    zh: string;
    en: string;
    current: string;
    footer: string;
  };
  provider: {
    select: string;
  };
  concurrency: {
    set: string;
    range: string;
    invalid: string;
    current: string;
    footer: string;
  };
  retry: {
    set: string;
    range: string;
    invalid: string;
    current: string;
    footer: string;
  };
  common: {
    escBack: string;
    saveAndBack: string;
  };
  divider: {
    prefix: string;
    middle: string;
  };
}

/** 插值参数类型 */
export interface InterpolationParams {
  [key: string]: string | number;
}

/** 翻译函数类型 */
export type TranslateFn = {
  (key: string): string;
  (key: string, params: InterpolationParams): string;
};