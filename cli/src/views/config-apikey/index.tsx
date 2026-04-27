/**
 * Config API Key Page - API Key 输入
 *
 * 功能:
 * - 输入 API Key
 * - 验证非空
 * - 自动填充 base_url
 * - 设置配置字段，返回首页（不自动保存）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { getProviderRegistry } from '@open-zread/utils';
import { useConfig, useEscHandler, usePrefilledConfig } from '../../provider';
import { useI18n } from '../../i18n';

export default function ConfigApiKeyPage() {
  const { providerId, modelId } = useParams<{ providerId: string; modelId: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setField } = useConfig();
  const { claimEsc, releaseEsc } = useEscHandler();

  // 从 URL 参数获取自定义模型名称（用于自定义 Provider 流程）
  const customModelName = searchParams.get('model');

  // 预填充值：provider 匹配时预填充 api_key 和 base_url
  const prefilledValues = usePrefilledConfig({ providerId });

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isEditingApiKey, setIsEditingApiKey] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerBaseUrl, setProviderBaseUrl] = useState<string>('');

  // 预填充标记（确保只预填充一次）
  const prefilledRef = useRef(false);

  // 预填充值变化时更新 state（解决异步加载问题）
  useEffect(() => {
    // 只预填充一次，且只在有值时填充
    if (!prefilledRef.current && prefilledValues.apiKey) {
      setApiKey(prefilledValues.apiKey);
      setBaseUrl(prefilledValues.baseUrl);
      prefilledRef.current = true;
    }
  }, [prefilledValues]);

  // 加载 Provider 信息
  useEffect(() => {
    if (!providerId) {
      navigate('/config/provider');
      return;
    }

    getProviderRegistry()
      .then(registry => {
        const provider = registry.getProvider(providerId);
        if (provider) {
          setProviderBaseUrl(provider.base_url || '');
          // 只有没有预填充值时，才使用 provider 的默认 base_url
          if (!prefilledValues.baseUrl && provider.base_url) {
            setBaseUrl(provider.base_url);
          }
        }
      });
  }, [providerId, navigate, prefilledValues.baseUrl]);

  // 设置配置并返回首页
  const handleSave = useCallback(() => {
    if (!apiKey.trim()) {
      setError(t('apikey.required'));
      return;
    }

    setError(null);

    // 设置配置字段（暂存，由首页 s 键统一保存）
    setField('llm.provider', providerId || '');
    setField('llm.model', modelId || customModelName || '');
    setField('llm.api_key', apiKey);
    const finalBaseUrl = baseUrl.trim() || providerBaseUrl;
    if (finalBaseUrl) {
      setField('llm.base_url', finalBaseUrl);
    }

    // 直接返回上一级（使用 -1 避免路由栈堆积）
    releaseEsc();
    navigate(-1);
  }, [apiKey, baseUrl, providerBaseUrl, providerId, modelId, customModelName, setField, navigate, releaseEsc, t]);

  // API Key 提交处理
  const handleApiKeySubmit = useCallback(() => {
    if (!apiKey.trim()) {
      setError(t('apikey.required'));
      return;
    }
    setError(null);
    setIsEditingApiKey(false);
  }, [apiKey, t]);

  // Base URL 提交处理（保存）
  const handleBaseUrlSubmit = useCallback(() => {
    handleSave();
  }, [handleSave]);

  // 监听按键（只在 Base URL 编辑模式处理 ESC）
  useInput((_input, key) => {
    if (!isEditingApiKey && key.escape) {
      // Base URL 编辑模式：ESC 返回 API Key 编辑
      setIsEditingApiKey(true);
    }
    // API Key 编辑模式：ESC 由 Layout 处理返回上一级
  });

  // ESC 处理权控制：
  // - API Key 编辑模式：释放 ESC（让 Layout 处理返回上一级）
  // - Base URL 编辑模式：声明 ESC（用于返回 API Key 编辑）
  useEffect(() => {
    if (!isEditingApiKey) {
      claimEsc();
    } else {
      releaseEsc();
    }
  }, [isEditingApiKey, claimEsc, releaseEsc]);

  // 页面退出时确保释放
  useEffect(() => {
    return () => releaseEsc();
  }, [releaseEsc]);

  return (
    <Box flexDirection="column">
      {/* API Key 输入 */}
      <Box marginTop={1}>
        <Text color={isEditingApiKey ? 'cyan' : 'gray'}>API Key: </Text>
        {isEditingApiKey ? (
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            onSubmit={handleApiKeySubmit}
            placeholder="sk-..."
            showCursor={true}
          />
        ) : (
          <Text dimColor>{apiKey.length > 0 ? t('apikey.hidden') : '(未设置)'}</Text>
        )}
      </Box>

      {/* 错误提示 */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Base URL 输入（非编辑 API Key 时显示） */}
      {!isEditingApiKey && (
        <Box marginTop={1}>
          <Text color="cyan">Base URL: </Text>
          <TextInput
            value={baseUrl}
            onChange={setBaseUrl}
            onSubmit={handleBaseUrlSubmit}
            placeholder={providerBaseUrl || 'https://api.example.com/v1'}
            showCursor={true}
          />
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        {isEditingApiKey ? (
          <Text dimColor>
            enter 下一步 | {t('common.escBack')}
          </Text>
        ) : (
          <Text dimColor>
            enter 保存 | esc 返回编辑 API Key
          </Text>
        )}
      </Box>
    </Box>
  );
}