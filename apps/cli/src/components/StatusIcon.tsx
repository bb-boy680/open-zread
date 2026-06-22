/**
 * StatusIcon - 状态图标组件
 *
 * 根据 status 渲染对应图标：
 * - loading: 静态加载符号（避免全屏模式下定时重绘）
 * - completed: ✓ 绿色
 * - failed: ✗ 红色
 * - waiting: ○ 灰色
 */

import { Text } from 'ink';
import { theme } from '../theme';
import type { Status } from '../views/wiki-generate/types';

interface StatusIconProps {
  status: Status;
  /** 颜色变体 */
  variant?: 'default' | 'active';
}

export default function StatusIcon({ status, variant = 'default' }: StatusIconProps) {
  const isActive = variant === 'active';

  if (status === 'loading') {
    return <Text color={isActive ? theme.primary : theme.warning}>⠴</Text>;
  }

  if (status === 'completed') {
    return <Text color={theme.success}>✓</Text>;
  }

  if (status === 'failed') {
    return <Text color={theme.error}>✗</Text>;
  }

  // waiting
  return <Text color={isActive ? theme.primary : theme.muted}>○</Text>;
}
