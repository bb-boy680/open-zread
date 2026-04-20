import { Box, Text, useInput, useApp } from 'ink';
import React from 'react';
import { useWikiStore } from '../store/useWikiStore';
import { useCatalogGen } from '../hooks/useCatalogGen';
import { Spinner } from './shared/Spinner';
import { StatusIcon } from './shared/StatusIcon';

/**
 * 目录生成页组件
 */
export function CatalogPage(): JSX.Element {
  const { exit } = useApp();

  // Store selectors
  const catalogStatus = useWikiStore((s) => s.catalogStatus);
  const catalogTokens = useWikiStore((s) => s.catalogTokens);

  // 目录生成逻辑
  useCatalogGen();

  // 键盘输入
  useInput((input) => {
    if (input === '\x03') exit();
  });

  // 状态文本
  const statusText = catalogStatus === 'running' ? '[请求中]'
    : catalogStatus === 'done' ? '[完成]'
    : catalogStatus === 'failed' ? '[失败]'
    : '[等待]';

  // Token 格式化
  const fmt = (n: number): string => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  const tokens = catalogTokens.in || catalogTokens.out
    ? ` ↑${fmt(catalogTokens.in)} ↓${fmt(catalogTokens.out)}`
    : '';

  return (
    <Box flexDirection="column">
      <Text bold>Zread — 生成 Wiki</Text>
      <Text dimColor>{'─'.repeat(54)}</Text>

      <Box marginTop={1}>
        <Text bold>── 目录 ──{'─'.repeat(42)}</Text>
      </Box>

      <Box marginTop={1}>
        {catalogStatus === 'running'
          ? <Spinner isRunning={true} />
          : <StatusIcon status={catalogStatus} />}
        <Text> 目录</Text>
        <Text dimColor> {statusText}</Text>
        {tokens && <Text dimColor>{tokens}</Text>}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>ctrl+c: 退出</Text>
      </Box>
    </Box>
  );
}