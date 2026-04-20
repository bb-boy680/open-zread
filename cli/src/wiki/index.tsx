/**
 * Wiki TUI 主入口
 *
 * 职责：路由渲染 + runWiki 入口函数
 */

import { render, Box, Text } from 'ink';
import React from 'react';
import { useWikiStore } from './store/useWikiStore';
import { HomePage } from './components/HomePage';
import { CatalogPage } from './components/CatalogPage';
import { WikiPage } from './components/WikiPage';
import type { Choice } from './types';

/**
 * Wiki App 路由组件
 */
function WikiApp({ onSelect }: { onSelect: (choice: Choice) => void }): JSX.Element | null {
  const page = useWikiStore((s) => s.page);
  const tasks = useWikiStore((s) => s.tasks);
  const error = useWikiStore((s) => s.error);

  if (page === 'home') {
    return <HomePage onSelect={onSelect} />;
  }

  if (page === 'catalog') {
    return <CatalogPage />;
  }

  if (page === 'wiki') {
    return <WikiPage />;
  }

  if (page === 'complete') {
    const done = tasks.filter((t) => t.status === 'done').length;
    return (
      <Box flexDirection="column">
        <Text bold color="green">✓ Wiki 生成完成</Text>
        <Text>成功: {done}/{tasks.length}</Text>
      </Box>
    );
  }

  if (page === 'error') {
    return (
      <Box flexDirection="column">
        <Text bold color="red">生成失败</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  return null;
}

/**
 * 运行 Wiki TUI
 */
export async function runWiki(_options: { force?: boolean } = {}): Promise<void> {
  // 延迟导入避免循环依赖
  const { loadConfig, getProjectRoot } = await import('@open-zread/utils');

  const config = await loadConfig();
  const root = getProjectRoot();

  // 初始化 store
  useWikiStore.getState().setInfo('0.2.3', config.llm.model ?? 'unknown', root);

  let choice: Choice | null = null;

  const { waitUntilExit, unmount } = render(
    <WikiApp onSelect={(c) => { choice = c; }} />
  );

  // 等待用户选择
  await new Promise<void>((resolve) => {
    const check = () => {
      if (choice) resolve();
      else setTimeout(check, 50);
    };
    check();
  });

  if (choice === 'cancel') {
    unmount();
    return;
  }

  // 启动 catalog
  useWikiStore.getState().setPage('catalog');
  useWikiStore.getState().setCatalogStatus('running');

  await waitUntilExit();
}