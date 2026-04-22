/**
 * Config Model Page - 模型选择
 *
 * 功能:
 * - 根据 Provider ID 动态加载 Model 列表
 * - 显示 max_tokens 等信息
 * - 支持自定义模型输入
 * - 键盘导航
 */

import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useParams, useNavigate } from 'react-router';
import { getProviderRegistry } from '@open-zread/utils';
import type { ModelInfo, ProviderInfo } from '@open-zread/utils';
import { useI18n } from '../../i18n';
import { useConfig } from '../../provider';
import Divider from '../../components/Divider';

export default function ConfigModelPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { config } = useConfig();

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载 Provider 和 Model 列表
  useEffect(() => {
    if (!providerId) {
      navigate('/config/provider');
      return;
    }

    setLoading(true);
    setError(null);
    getProviderRegistry()
      .then(registry => {
        const p = registry.getProvider(providerId);
        if (p) {
          setProvider(p);
          const modelList = registry.getModels(providerId);
          setModels(modelList);
          // 如果是 'custom' provider 或没有预置模型，直接跳转到自定义流程
          // 使用 replace 避免历史循环（ESC 返回时跳过此页面）
          if (providerId === 'custom' || modelList.length === 0) {
            navigate(`/config/provider/${providerId}/custom`, { replace: true });
            return;
          }
          // 找到当前选中的 model 并设置 selectedIndex
          const currentIndex = modelList.findIndex(m => m.id === config.llm.model);
          if (currentIndex >= 0) {
            setSelectedIndex(currentIndex);
          }
        } else {
          setError(`Provider "${providerId}" not found`);
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Load failed');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [providerId, config.llm.model, navigate]);

  // 显示列表：已有模型 + 自定义选项
  const displayItems = models.length > 0
    ? [...models, { id: 'custom', name: t('model.custom') }]
    : [{ id: 'custom', name: t('model.custom') }];

  // 键盘导航（ESC 返回由 Layout 统一处理）
  useInput((input, key) => {
    if (loading) return;

    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(displayItems.length - 1, selectedIndex + 1));
    } else if (key.return) {
      const selected = displayItems[selectedIndex];
      if (selected.id === 'custom') {
        // 直接跳转到自定义流程页面
        navigate(`/config/provider/${providerId}/custom`);
      } else {
        // 跳转到 API Key 输入页
        navigate(`/config/provider/${providerId}/model/${selected.id}`);
      }
    }
  });

  // 加载中状态
  if (loading) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">{t('model.loading')}</Text>
        </Box>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="red">{error}</Text>
        </Box>
        <Box>
          <Text dimColor>{t('common.escBack')}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* ========== Header ========== */}
      <Box>
        <Text bold>{t('model.select')}</Text>
        <Text dimColor> · {provider?.name || providerId}</Text>
      </Box>
      <Divider />

      {/* ========== 无预置模型提示 ========== */}
      {models.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>{t('model.noModels')}</Text>
        </Box>
      )}

      {/* ========== Model 列表 ========== */}
      <Box marginTop={1} flexDirection="column">
        {displayItems.map((model, index) => (
          <Box key={model.id} marginBottom={0}>
            <Text color={index === selectedIndex ? 'cyan' : 'gray'}>
              {index === selectedIndex ? '│ ' : '  '}
            </Text>
            <Text
              bold={index === selectedIndex}
              color={index === selectedIndex ? 'white' : 'gray'}
            >
              {model.name}
            </Text>
            {model.max_tokens && (
              <Text dimColor color="gray"> ({model.max_tokens} {t('model.tokens')})</Text>
            )}
            {model.id === config.llm.model && providerId === config.llm.provider && (
              <Text color="green" dimColor> ← {t('provider.current')}</Text>
            )}
            {/* 显示能力标签 */}
            {(model.supports_tools || model.supports_vision || model.supports_thinking) && (
              <Box marginLeft={1}>
                <Text dimColor>
                  [
                  {model.supports_tools && <Text color="yellow">tools</Text>}
                  {model.supports_vision && <Text color="blue"> vision</Text>}
                  {model.supports_thinking && <Text color="magenta"> thinking</Text>}
                  ]
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* ========== Footer ========== */}
      <Box marginTop={1}>
        <Text dimColor>{t('model.footer')}</Text>
      </Box>
    </Box>
  );
}