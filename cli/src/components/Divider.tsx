/**
 * Divider - 分割线公共组件
 *
 * 支持两种格式：
 * 1. 简单分割线：────────────────────────────────────
 * 2. 带标题分割线：── 目录 ───────────────────────────
 *
 * 动态适配终端宽度，确保单行不换行
 */

import { Box, Text, useStdout } from "ink";
import { getDisplayWidth, truncateByDisplayWidth } from "../utils";

interface DividerProps {
  /** 标题文本（可选） */
  title?: string;
  /** 颜色（可选，默认 dimColor） */
  color?: string;
}

export default function Divider({ title, color }: DividerProps) {
  const { stdout } = useStdout();
  // Layout 有 paddingX={2}，需要减去 4 个字符宽度
  const layoutPadding = 4;
  const terminalWidth = (stdout?.columns ?? 80) - layoutPadding;

  if (title) {
    // 带标题格式：── 标题 ───────────────────────
    const prefix = "── ";
    const middle = " ─";

    // 计算已使用的显示宽度
    const usedWidth = getDisplayWidth(prefix) + getDisplayWidth(title) + getDisplayWidth(middle);

    // 计算填充线的长度（显示宽度）
    const fillWidth = Math.max(0, terminalWidth - usedWidth);

    // 拼接完整字符串
    const line = prefix + title + middle + "─".repeat(fillWidth);

    // 按显示宽度截断确保单行
    const truncated = truncateByDisplayWidth(line, terminalWidth);

    return (
      <Box marginTop={1}>
        <Text dimColor={!color} color={color}>{truncated}</Text>
      </Box>
    );
  }

  // 简单分割线
  return (
    <Box marginTop={1}>
      <Text dimColor={!color} color={color}>{"─".repeat(terminalWidth)}</Text>
    </Box>
  );
}