import { createContext, useEffect, useCallback, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { useImmer } from 'use-immer';
import type { AppConfig } from '@open-zread/types';
import { loadConfig, saveConfig } from '@open-zread/utils';

export interface ConfigContextValue {
  config: AppConfig;
  originalConfig: AppConfig;
  setField: (key: string, value: string | number) => void;
  save: () => Promise<boolean>;
  hasChanges: boolean;
  isLoading: boolean;
  error: string | null;
}

export const ConfigContext = createContext<ConfigContextValue | null>(null);

interface ConfigProviderProps {
  children?: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, updateConfig] = useImmer<AppConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useImmer<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useImmer(true);
  const [error, updateError] = useImmer<string | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig()
      .then((loaded) => {
        updateConfig(() => loaded);
        setOriginalConfig(() => loaded);
        setIsLoading(false);
      })
      .catch((err) => {
        updateError(() => err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
  }, []);

  // 修改单项（使用 immer 的 draft 模式）
  const setField = useCallback((key: string, value: string | number) => {
    updateConfig((draft) => {
      if (!draft) return;

      // 处理嵌套字段 (如 llm.provider, concurrency.max_concurrent)
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        const parentObj = draft[parent as keyof AppConfig] as Record<string, unknown>;
        if (parentObj) {
          parentObj[child] = value;
        }
        return;
      }

      // 处理顶级字段
      if (key === 'language' || key === 'doc_language') {
        draft[key] = value as string;
      }
    });
  }, []);

  // 检测是否有修改
  const hasChanges = config !== null && originalConfig !== null &&
    JSON.stringify(config) !== JSON.stringify(originalConfig);

  // 保存配置
  const save = useCallback(async (): Promise<boolean> => {
    if (!config) return false;

    try {
      await saveConfig(config);
      setOriginalConfig(() => config);
      return true;
    } catch (err) {
      updateError(() => err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [config]);

  // 加载中状态
  if (isLoading) {
    return null;
  }

  // 错误状态
  if (error || !config || !originalConfig) {
    return null;
  }

  return (
    <ConfigContext.Provider
      value={{
        config,
        originalConfig,
        setField,
        save,
        hasChanges,
        isLoading,
        error,
      }}
    >
      {children ?? <Outlet />}
    </ConfigContext.Provider>
  );
}