/**
 * Divider - 分割线公共组件
 *
 * 支持两种格式：
 * 1. 简单分割线：────────────────────────────────────
 * 2. 带标题分割线：── 目录 ───────────────────────────
 */

import { Text, useStdout } from "ink";

interface DividerProps {
  /** 标题文本（可选） */
  title?: string;
}

/**
 * 计算字符串的终端显示宽度
 * 中文字符占2格，ASCII字符占1格
 */
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    // 中文字符范围
    if (/[一-鿿]/.test(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

export default function Divider({ title }: DividerProps) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;

  if (title) {
    // 带标题格式：── 标题 ───────────────────────
    const prefix = "── ";
    const middle = " ─";

    // 计算标题的终端显示宽度（中文占2格）
    const titleDisplayWidth = getDisplayWidth(title);
    const usedWidth = prefix.length + titleDisplayWidth + middle.length;
    const fillLength = terminalWidth - usedWidth;

    // 拼接完整字符串，避免 JSX 多行渲染
    const line = prefix + title + middle + "─".repeat(Math.max(0, fillLength));

    return <Text dimColor>{line}</Text>;
  }

  // 简单分割线
  return <Text dimColor>{"─".repeat(terminalWidth)}</Text>;
}
