/**
 * i18n 导出入口 - 翻译逻辑
 */

// Provider 从 provider 目录导出（保持向后兼容）
export { I18nContext, I18nProvider, type I18nContextValue } from '../provider/i18n';
export { useI18n } from './useI18n';
export { getTranslation, normalizeLanguageCode } from './translations';
export type { LanguageCode, TranslationKeys, InterpolationParams, TranslateFn } from './types';