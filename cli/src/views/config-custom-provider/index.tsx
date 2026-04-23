/**
 * Config Custom Provider Page - 自定义 Provider/模型配置
 *
 * 两种流程：
 * 1. 完全自定义 Provider (providerId === 'custom'): Base URL → Model Name → API Key
 * 2. 已有 Provider 自定义模型 (providerId !== 'custom'): Model Name → API Key
 *
 * 完成后直接返回首页，不自动保存（由首页 s 键统一保存）
 */

import { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useParams, useNavigate } from 'react-router';
import { getProviderRegistry } from '@open-zread/utils';
import { useConfig, useEscHandler } from '../../provider';
import { useI18n } from '../../i18n';

type Step = 'baseUrl' | 'modelName' | 'apiKey';

export default function ConfigCustomProviderPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setField } = useConfig();
  const { claimEsc, releaseEsc } = useEscHandler();

  // 是否是完全自定义 Provider（需要 Base URL 步骤）
  const isFullCustom = providerId === 'custom' || !providerId;

  const [providerBaseUrl, setProviderBaseUrl] = useState<string>('');
  const [step, setStep] = useState<Step>(isFullCustom ? 'baseUrl' : 'modelName');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<Record<Step, string>>({
    baseUrl: '',
    modelName: '',
    apiKey: '',
  });

  // 计算步骤编号
  const stepNumber = isFullCustom
    ? (step === 'baseUrl' ? 1 : step === 'modelName' ? 2 : 3)
    : (step === 'modelName' ? 1 : 2);
  const totalSteps = isFullCustom ? 3 : 2;

  // 加载已有 Provider 信息
  useEffect(() => {
    if (!isFullCustom && providerId) {
      getProviderRegistry()
        .then(registry => {
          const p = registry.getProvider(providerId);
          if (p) {
            setProviderBaseUrl(p.base_url || '');
            if (p.base_url) {
              setBaseUrl(p.base_url);
            }
          }
        });
    }
  }, [isFullCustom, providerId]);

  // 进入页面时声明 ESC 处理权（需要多步骤回退）
  useEffect(() => {
    claimEsc();
    return () => releaseEsc();
  }, [claimEsc, releaseEsc]);

  // URL 格式验证
  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // 前一步（ESC 由此处理，Layout 不处理）
  const handleBack = useCallback(() => {
    setErrors({ baseUrl: '', modelName: '', apiKey: '' });
    switch (step) {
      case 'baseUrl':
        releaseEsc();
        navigate(-1);
        break;
      case 'modelName':
        if (isFullCustom) {
          setStep('baseUrl');
        } else {
          releaseEsc();
          navigate(-1);
        }
        break;
      case 'apiKey':
        setStep('modelName');
        break;
    }
  }, [step, isFullCustom, navigate, releaseEsc]);

  // Base URL 提交处理
  const handleBaseUrlSubmit = useCallback(() => {
    setErrors({ ...errors, baseUrl: '' });

    if (!baseUrl.trim()) {
      setErrors({ ...errors, baseUrl: 'URL 不能为空' });
      return;
    }
    if (!validateUrl(baseUrl)) {
      setErrors({ ...errors, baseUrl: t('customProvider.invalidUrl') });
      return;
    }
    setStep('modelName');
  }, [baseUrl, errors, t]);

  // Model Name 提交处理
  const handleModelNameSubmit = useCallback(() => {
    setErrors({ ...errors, modelName: '' });

    if (!modelName.trim()) {
      setErrors({ ...errors, modelName: '模型名称不能为空' });
      return;
    }
    setStep('apiKey');
  }, [modelName, errors]);

  // API Key 提交处理：设置字段值，直接返回首页
  const handleApiKeySubmit = useCallback(() => {
    setErrors({ ...errors, apiKey: '' });

    if (!apiKey.trim()) {
      setErrors({ ...errors, apiKey: t('apikey.required') });
      return;
    }

    // 设置配置字段（暂存，由首页 s 键统一保存）
    setField('llm.provider', providerId || 'custom');
    setField('llm.model', modelName);
    setField('llm.api_key', apiKey);
    const finalBaseUrl = baseUrl.trim() || providerBaseUrl;
    if (finalBaseUrl) {
      setField('llm.base_url', finalBaseUrl);
    }

    // 直接返回上一级（使用 -1 避免路由栈堆积）
    releaseEsc();
    navigate(-1);
  }, [apiKey, errors, t, providerId, modelName, baseUrl, providerBaseUrl, setField, navigate, releaseEsc]);

  // 键盘处理（只处理 esc）
  useInput((_input, key) => {
    if (key.escape) {
      handleBack();
    }
  });

  return (
    <Box flexDirection="column">
      {/* 步骤显示 */}
      <Box marginTop={1}>
        <Text dimColor>{t('customProvider.step', { current: stepNumber, total: totalSteps })}</Text>
      </Box>

      {/* 步骤: Base URL（仅完全自定义） */}
      {isFullCustom && (
        <>
          <Box marginTop={1}>
            <Text color={step === 'baseUrl' ? 'cyan' : 'gray'}>
              {step === 'baseUrl' ? '> ' : '  '}
            </Text>
            <Text color={step === 'baseUrl' ? 'white' : 'gray'} bold={step === 'baseUrl'}>
              {t('customProvider.baseUrl')}
            </Text>
            {step !== 'baseUrl' && baseUrl && (
              <Text dimColor color="green">: {baseUrl}</Text>
            )}
          </Box>

          {/* Base URL 输入 */}
          {step === 'baseUrl' && (
            <Box marginLeft={2}>
              <TextInput
                value={baseUrl}
                onChange={setBaseUrl}
                onSubmit={handleBaseUrlSubmit}
                placeholder={t('customProvider.baseUrlPlaceholder')}
                showCursor={true}
              />
            </Box>
          )}

          {/* Base URL 错误 */}
          {step === 'baseUrl' && errors.baseUrl && (
            <Box marginLeft={2}>
              <Text color="red">{errors.baseUrl}</Text>
            </Box>
          )}
        </>
      )}

      {/* 步骤: Model Name */}
      <Box marginTop={1}>
        <Text color={step === 'modelName' ? 'cyan' : 'gray'}>
          {step === 'modelName' ? '> ' : '  '}
        </Text>
        <Text color={step === 'modelName' ? 'white' : 'gray'} bold={step === 'modelName'}>
          {t('customProvider.modelName')}
        </Text>
        {step !== 'modelName' && modelName && (
          <Text dimColor color="green">: {modelName}</Text>
        )}
      </Box>

      {/* Model Name 输入 */}
      {step === 'modelName' && (
        <Box marginLeft={2}>
          <TextInput
            value={modelName}
            onChange={setModelName}
            onSubmit={handleModelNameSubmit}
            placeholder={t('customProvider.modelNamePlaceholder')}
            showCursor={true}
          />
        </Box>
      )}

      {/* Model Name 错误 */}
      {step === 'modelName' && errors.modelName && (
        <Box marginLeft={2}>
          <Text color="red">{errors.modelName}</Text>
        </Box>
      )}

      {/* 步骤: API Key */}
      <Box marginTop={1}>
        <Text color={step === 'apiKey' ? 'cyan' : 'gray'}>
          {step === 'apiKey' ? '> ' : '  '}
        </Text>
        <Text color={step === 'apiKey' ? 'white' : 'gray'} bold={step === 'apiKey'}>
          {t('customProvider.apikey')}
        </Text>
        {step !== 'apiKey' && apiKey && (
          <Text dimColor color="green">: {t('apikey.hidden')}</Text>
        )}
      </Box>

      {/* API Key 输入 */}
      {step === 'apiKey' && (
        <Box marginLeft={2}>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            onSubmit={handleApiKeySubmit}
            placeholder={t('apikey.placeholder')}
            showCursor={true}
          />
        </Box>
      )}

      {/* API Key 错误 */}
      {step === 'apiKey' && errors.apiKey && (
        <Box marginLeft={2}>
          <Text color="red">{errors.apiKey}</Text>
        </Box>
      )}

      {/* 已有 Provider 的 Base URL 提示 */}
      {!isFullCustom && providerBaseUrl && step === 'modelName' && (
        <Box marginTop={1}>
          <Text dimColor>Base URL: {providerBaseUrl}</Text>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>{t('customProvider.footer')}</Text>
      </Box>
    </Box>
  );
}