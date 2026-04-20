import { Text } from 'ink';
import type { TaskStatus } from '../../types';

interface StatusIconProps {
  status: TaskStatus;
  frame?: string;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: string; color: string }> = {
  pending: { icon: '○', color: 'gray' },
  running: { icon: '', color: 'cyan' },
  done: { icon: '✓', color: 'green' },
  failed: { icon: '✗', color: 'red' },
};

/**
 * 状态图标组件
 */
export function StatusIcon({ status, frame }: StatusIconProps): JSX.Element {
  const config = STATUS_CONFIG[status];
  const icon = status === 'running' ? (frame ?? '⠋') : config.icon;
  return <Text color={config.color}>{icon}</Text>;
}