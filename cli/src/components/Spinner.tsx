/**
 * Spinner - 动态加载指示器组件
 *
 * 封装 ink-spinner，提供统一的加载动画样式
 */

import { Text } from 'ink';
import Spinner from 'ink-spinner';
import { theme } from '../theme';

interface SpinnerProps {
  /** spinner 类型 */
  type?: 'dots' | 'dots2' | 'dots3' | 'dots4' | 'dots5' | 'dots6' | 'dots7' | 'dots8' | 'dots9' | 'dots10' | 'dots11' | 'dots12';
  /** 颜色 */
  color?: string;
}

/**
 * 默认使用 dots 类型（⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏）
 * 默认使用主题警告色（Orange）
 */
export default function SpinnerComponent({ type = 'dots', color = theme.warning }: SpinnerProps) {
  return (
    <Text color={color}>
      <Spinner type={type} />
    </Text>
  );
}