import { Box, Text, useInput, useApp } from 'ink';
import React from 'react';
import { useWikiStore } from '../store/useWikiStore';
import { useWikiGen } from '../hooks/useWikiGen';
import { useSpinner } from '../hooks/useSpinner';
import { StatusIcon } from './shared/StatusIcon';

/**
 * Wiki 内容生成页组件
 */
export function WikiPage(): JSX.Element {
  const { exit } = useApp();

  // Store selectors
  const tasks = useWikiStore((s) => s.tasks);
  const taskIndex = useWikiStore((s) => s.taskIndex);
  const taskNav = useWikiStore((s) => s.taskNav);

  // Wiki 生成逻辑
  useWikiGen();

  // Spinner 动画
  const hasRunning = tasks.some((t) => t.status === 'running');
  const frame = useSpinner(hasRunning);

  // 键盘导航
  useInput((input, key) => {
    if (key.upArrow) taskNav('up');
    if (key.downArrow) taskNav('down');
    if (input === '\x03') exit();
  });

  // 统计
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  // Token 格式化
  const fmt = (n: number): string => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  // 状态文本
  const statusText = (status: string): string => {
    if (status === 'running') return '[请求中]';
    if (status === 'done') return '[完成]';
    if (status === 'failed') return '[失败]';
    return '[等待]';
  };

  return (
    <Box flexDirection="column">
      <Text bold>── 文章 {doneCount}/{tasks.length} ──{'─'.repeat(34)}</Text>

      <Box marginTop={1} flexDirection="column">
        {tasks.map((t, i) => {
          const active = i === taskIndex;
          const ic = t.status === 'running' ? frame : undefined;
          const tk = t.tokens ? ` ↑${fmt(t.tokens.in)} ↓${fmt(t.tokens.out)}` : '';

          return (
            <Box key={t.id}>
              <Text color={active ? 'cyan' : 'gray'}>{active ? '>' : ' '} </Text>
              <StatusIcon status={t.status} frame={ic} />
              <Text color={active ? 'cyan' : 'white'} bold={active}> {t.title}</Text>
              <Text dimColor> {statusText(t.status)}</Text>
              {tk && <Text dimColor>{tk}</Text>}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑/↓: 导航 | ctrl+c: 退出</Text>
      </Box>
    </Box>
  );
}