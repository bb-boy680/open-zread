/**
 * useI18n Hook - 获取翻译函数
 */

import { useContext } from 'react';
import { I18nContext } from './I18nContext';
import type { InterpolationParams, TranslateFn } from './types';

/** 获取嵌套对象的值 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/** 插值替换 {param} */
function interpolate(template: string, params: InterpolationParams): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return String(params[key] ?? `{${key}}`);
  });
}

/**
 * i18n Hook
 *
 * 用法:
 *   const { t, language } = useI18n();
 *   const title = t('config.title');
 *   const defaultText = t('config.default', { default: '1' });
 */
export function useI18n(): { t: TranslateFn; language: string } {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  const { t: translations, language } = context;

  const t: TranslateFn = (key: string, params?: InterpolationParams) => {
    const template = getNestedValue(
      translations as unknown as Record<string, unknown>,
      key
    );

    if (template === undefined) {
      // 开发环境返回键名，生产环境返回空字符串
      return '';
    }

    if (params) {
      return interpolate(template, params);
    }

    return template;
  };

  return { t, language };
}