/**
 * 翻译聚合导出
 */

import type { LanguageCode, TranslationKeys } from '../types';
import { zhCN } from './zh-CN';
import { enUS } from './en-US';

export const translations: Record<LanguageCode, TranslationKeys> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

/** 获取指定语言的翻译字典 */
export function getTranslation(lang: LanguageCode): TranslationKeys {
  return translations[lang] ?? translations['zh-CN'];
}

/** 将配置语言代码映射到标准语言代码 */
export function normalizeLanguageCode(configLang: string): LanguageCode {
  const langMap: Record<string, LanguageCode> = {
    zh: 'zh-CN',
    'zh-CN': 'zh-CN',
    en: 'en-US',
    'en-US': 'en-US',
  };
  return langMap[configLang] ?? 'zh-CN';
}