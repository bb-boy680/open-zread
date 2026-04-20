import { Box, Text, useInput, useApp } from 'ink';
import React from 'react';
import { useWikiStore } from '../store/useWikiStore';
import { useDraftCheck } from '../hooks/useDraftCheck';
import type { Choice } from '../types';

interface HomePageProps {
  onSelect: (choice: Choice) => void;
}

/**
 * 首页组件
 */
export function HomePage({ onSelect }: HomePageProps): JSX.Element {
  const { exit } = useApp();

  // Store selectors
  const version = useWikiStore((s) => s.version);
  const modelName = useWikiStore((s) => s.modelName);
  const projectDir = useWikiStore((s) => s.projectDir);
  const draftInfo = useWikiStore((s) => s.draftInfo);
  const selectedIndex = useWikiStore((s) => s.selectedIndex);
  const nav = useWikiStore((s) => s.nav);

  // 草稿检测逻辑
  useDraftCheck();

  // 键盘导航
  useInput((input, key) => {
    if (key.upArrow) nav('up');
    if (key.downArrow) nav('down');
    if (key.return) {
      const choice: Choice = selectedIndex === 0
        ? 'continue'
        : selectedIndex === 1
          ? 'clear'
          : 'cancel';
      onSelect(choice);
    }
    if (input === '\x03') exit();
  });

  // 格式化目录
  const home = process.env.HOME ?? '';
  const dir = projectDir.startsWith(home)
    ? `~${projectDir.slice(home.length)}`
    : projectDir;

  const draft = draftInfo;
  const choices = ['继续生成', '清除草稿并重新开始', '取消'];

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" width={52}>
        <Text bold>open-zread {version}</Text>
        <Box height={1} />
        <Box>
          <Text dimColor>模型: </Text>
          <Text>{modelName}</Text>
        </Box>
        <Box>
          <Text dimColor>目录: </Text>
          <Text>{dir}</Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>Zread 将本地代码库转化为可读文档。</Text>
        <Text dimColor>浏览开源项目，访问 https://zread.ai</Text>
      </Box>

      <Text dimColor>{'─'.repeat(54)}</Text>

      {draft && draft.completed < draft.total && (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color="yellow">文档生成未完成，仍有此前草稿</Text>
            <Text dimColor> (已完成：{draft.completed}/{draft.total})</Text>
          </Box>
          <Text>请选择操作：</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        {choices.map((label, i) => (
          <Box key={i}>
            <Text color={i === selectedIndex ? 'cyan' : 'gray'}>
              {i === selectedIndex ? '>' : ' '} {label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑/↓: 导航 | enter: 选择 | ctrl+c: 退出</Text>
      </Box>
    </Box>
  );
}