/**
 * usePrefilledConfig - 预填充配置值 Hook
 *
 * 用于配置页面预填充现有值，避免重复输入
 *
 * 预填充策略：
 * - api_key、base_url：provider 匹配时预填充（同 provider 共用）
 * - modelName：provider + model 都匹配时才预填充
 */

import { useMemo } from 'react';
import { useConfig } from './useConfig';

export interface PrefilledConfigOptions {
  providerId: string | undefined;
}

export interface PrefilledConfigValues {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

/**
 * 根据当前配置计算预填充值
 *
 * @param options - providerId
 * @returns 预填充值对象
 */
export function usePrefilledConfig(options: PrefilledConfigOptions): PrefilledConfigValues {
  // providerId 为 undefined 时默认使用 'custom'
  const providerId = options.providerId ?? 'custom';
  const { config } = useConfig();

  return useMemo(() => {

    // api_key 和 base_url：provider 匹配时预填充
    const providerMatches = providerId === config.llm.provider;

    // modelName：provider + model 都匹配时才预填充
    const modelMatches = providerMatches && config.llm.model;

    const result = {
      apiKey: providerMatches ? config.llm.api_key || '' : '',
      baseUrl: providerMatches ? config.llm.base_url || '' : '',
      modelName: modelMatches ? config.llm.model : '',
    };


    return result;
  }, [
    providerId,
    config.llm.provider,
    config.llm.model,
    config.llm.api_key,
    config.llm.base_url,
  ]);
}