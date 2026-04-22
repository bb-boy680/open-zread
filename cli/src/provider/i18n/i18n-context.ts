/**
 * I18n Context - React Context for i18n
 */

import { createContext } from 'react';
import type { LanguageCode, TranslationKeys } from '../../i18n/types';

export interface I18nContextValue {
  t: TranslationKeys;
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);