/**
 * I18n Provider - 异步加载配置并提供翻译
 */

import { createContext } from 'react';
import type { LanguageCode, TranslationKeys } from './types';

export interface I18nContextValue {
  t: TranslationKeys;
  language: LanguageCode;
}

export const I18nContext = createContext<I18nContextValue | null>(null);