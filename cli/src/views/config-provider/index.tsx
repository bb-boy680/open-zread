/**
 * Config Provider Page - LLM 提供商选择
 *
 * 功能:
 * - 动态加载 Provider 列表（从 ProviderRegistry）
 * - 自定义 Provider 选项放在最前面
 * - 搜索功能（/ 键激活）
 * - 键盘导航（↑↓）
 * - 刷新列表（r 键）
 * - 选择后跳转 Model 选择页
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useNavigate } from 'react-router';
import { getProviderRegistry } from '@open-zread/utils';
import type { ProviderInfo } from '@open-zread/utils';
import { useConfig, useEscHandler } from '../../provider';
import { useI18n } from '../../i18n';
import Divider from '../../components/Divider';

// 自定义 Provider 选项（固定放在第一位）
const CUSTOM_PROVIDER_OPTION: ProviderInfo = {
  id: 'custom',
  name: '自定义 Provider...',
  npm: '',
  base_url: '',
  models: {},
};

export default function ConfigProviderPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { claimEsc, releaseEsc } = useEscHandler();

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载 Provider 列表
  useEffect(() => {
    loadProviders(false);
  }, []);

  const loadProviders = useCallback((forceRefresh: boolean) => {
    setLoading(true);
    setError(null);
    getProviderRegistry(forceRefresh)
      .then(registry => {
        const list = registry.getAllProviders();
        setProviders(list);
        // 如果当前是自定义 provider，选中第一位
        if (config.llm.provider === 'custom') {
          setSelectedIndex(0);
        } else {
          // 否则找到当前 provider（索引需要 +1，因为第一位是自定义选项）
          const currentIndex = list.findIndex(p => p.id === config.llm.provider);
          if (currentIndex >= 0) {
            setSelectedIndex(currentIndex + 1);
          }
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : t('provider.error'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [config.llm.provider, t]);

  // 显示列表：自定义选项 + 已有 Provider（排除 registry 中的 custom）
  const displayProviders = [
    CUSTOM_PROVIDER_OPTION,
    ...providers.filter(p => p.id !== 'custom'),
  ];

  // 搜索过滤（不包括自定义选项）
  const filteredProviders = searchQuery
    ? providers.filter(p =>
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : providers;

  // 搜索时的显示列表
  const searchDisplayProviders = searchQuery
    ? filteredProviders
    : displayProviders;

  // 搜索确认处理
  const handleSearchSubmit = useCallback(() => {
    setIsSearchMode(false);
    releaseEsc();
    if (filteredProviders.length > 0) {
      // 搜索模式下索引是相对于过滤结果的
      setSelectedIndex(0);
    }
  }, [filteredProviders.length, releaseEsc]);

  // 进入搜索模式时声明 ESC 处理权
  useEffect(() => {
    if (isSearchMode) {
      claimEsc();
    }
  }, [isSearchMode, claimEsc]);

  // 键盘导航
  useInput((input, key) => {
    if (loading) return;

    // ESC 键只在搜索模式下处理（退出搜索）
    if (key.escape) {
      if (isSearchMode) {
        setIsSearchMode(false);
        setSearchQuery('');
        releaseEsc();
      }
      return;
    }

    // 搜索模式下，其他键由 TextInput 处理
    if (isSearchMode) return;

    // 当前显示的列表（搜索时用过滤结果，否则用完整列表）
    const currentList = searchQuery ? filteredProviders : displayProviders;
    const maxIndex = currentList.length - 1;

    // 正常导航模式
    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(maxIndex, selectedIndex + 1));
    } else if (key.return && currentList[selectedIndex]) {
      const selectedProvider = currentList[selectedIndex];
      navigate(`/config/provider/${selectedProvider.id}`);
    } else if (input === '/') {
      setIsSearchMode(true);
      setSearchQuery('');
    } else if (input === 'r') {
      loadProviders(true);
    }
  });

  // 加载中状态
  if (loading) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">{t('provider.loading')}</Text>
        </Box>
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="red">{t('provider.error')}: {error}</Text>
        </Box>
        <Box>
          <Text dimColor>{t('common.escBack')} | r {t('provider.refresh')}</Text>
        </Box>
      </Box>
    );
  }

  // 搜索模式显示 - 使用 TextInput 组件
  if (isSearchMode) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>{t('provider.search')}</Text>
        </Box>
        <Divider />
        <Box marginTop={1}>
          <Text color="cyan">搜索: </Text>
          <TextInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearchSubmit}
            placeholder="输入 Provider 名称..."
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            找到 {filteredProviders.length} 个结果 | {t('common.escBack')} | enter 确认
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* ========== Header ========== */}
      <Box>
        <Text bold>{t('provider.select')}</Text>
        <Text dimColor> · {t('provider.current')}: {config.llm.provider}</Text>
      </Box>
      <Divider />

      {/* ========== Provider 列表 ========== */}
      <Box marginTop={1} flexDirection="column">
        {displayProviders.length === 0 ? (
          <Text dimColor>没有 Provider</Text>
        ) : (
          displayProviders.map((provider, index) => (
            <Box key={provider.id} marginBottom={0}>
              <Text color={index === selectedIndex ? 'cyan' : 'gray'}>
                {index === selectedIndex ? '│ ' : '  '}
              </Text>
              <Text
                bold={index === selectedIndex}
                color={index === selectedIndex ? 'white' : 'gray'}
              >
                {provider.name}
              </Text>
              {/* 当前选中标记 */}
              {provider.id === config.llm.provider && (
                <Text color="green" dimColor> ← {t('provider.current')}</Text>
              )}
              {/* 显示 npm 包名（非自定义选项） */}
              {provider.id !== 'custom' && provider.npm && (
                <Text dimColor color="gray"> ({provider.npm})</Text>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* ========== Footer ========== */}
      <Box marginTop={1}>
        <Text dimColor>{t('provider.footer')}</Text>
      </Box>
    </Box>
  );
}