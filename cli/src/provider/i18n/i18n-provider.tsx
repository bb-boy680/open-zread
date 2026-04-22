/**
 * I18n Provider - 异步加载配置并提供翻译
 */

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Text } from 'ink';
import { I18nContext } from './i18n-context';
import { getTranslation, normalizeLanguageCode } from '../../i18n/translations';
import { loadConfig } from '@open-zread/utils';
import type { LanguageCode, TranslationKeys } from '../../i18n/types';

interface I18nProviderProps {
  children: ReactNode;
  fallbackLanguage?: LanguageCode;
}

interface I18nState {
  translations: TranslationKeys | null;
  language: LanguageCode;
  isLoading: boolean;
}

export function I18nProvider({ children, fallbackLanguage = 'zh-CN' }: I18nProviderProps) {
  const [state, setState] = useState<I18nState>({
    translations: null,
    language: fallbackLanguage,
    isLoading: true,
  });

  useEffect(() => {
    async function loadI18n() {
      try {
        const config = await loadConfig();
        const language = normalizeLanguageCode(config.language);
        const translations = getTranslation(language);
        setState({
          translations,
          language,
          isLoading: false,
        });
      } catch {
        // 配置加载失败时使用 fallback 语言
        setState({
          translations: getTranslation(fallbackLanguage),
          language: fallbackLanguage,
          isLoading: false,
        });
      }
    }

    loadI18n();
  }, [fallbackLanguage]);

  // 热更新语言
  const setLanguage = useCallback((language: LanguageCode) => {
    setState((prev) => ({
      ...prev,
      language,
      translations: getTranslation(language),
    }));
  }, []);

  // 加载中显示简单提示
  if (state.isLoading || !state.translations) {
    return <Text dimColor>Loading...</Text>;
  }

  return (
    <I18nContext.Provider value={{ t: state.translations, language: state.language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}