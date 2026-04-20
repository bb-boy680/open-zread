import { Text } from 'ink';
import { useSpinner } from '../../hooks/useSpinner';

interface SpinnerProps {
  isRunning: boolean;
}

/**
 * Spinner 组件（封装 useSpinner hook）
 */
export function Spinner({ isRunning }: SpinnerProps): JSX.Element {
  const frame = useSpinner(isRunning);
  return <Text color="cyan">{frame}</Text>;
}