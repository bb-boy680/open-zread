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
  };
  language: {
    select: string;
  };
  docLanguage: {
    select: string;
  };
  provider: {
    select: string;
  };
  concurrency: {
    set: string;
  };
  retry: {
    set: string;
  };
  common: {
    escBack: string;
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