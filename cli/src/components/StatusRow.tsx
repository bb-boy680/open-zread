/**
 * StatusRow - 两栏布局组件
 *
 * 纯布局组件：
 * - 左栏：标题内容
 * - 右栏：状态内容
 * - 中间自动填充，确保右栏对齐
 *
 * 使用 Box flexGrow 实现，无需手动计算
 */

import { Box } from 'ink';
import type { ReactNode } from 'react';

interface StatusRowProps {
  /** 左栏内容 */
  left: ReactNode;
  /** 右栏内容 */
  right: ReactNode;
}

export default function StatusRow({ left, right }: StatusRowProps) {
  return (
    <Box width="100%">
      {/* 左侧内容 */}
      <Box>{left}</Box>

      {/* 中间自动填充 */}
      <Box flexGrow={1} />

      {/* 右侧内容 */}
      <Box>{right}</Box>
    </Box>
  );
}