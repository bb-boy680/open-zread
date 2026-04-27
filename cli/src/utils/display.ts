/**
 * 终端显示相关工具函数
 */

import { readFileSync } from "fs";
import { join } from "path";

// 缓存版本号（只读取一次）
let cachedVersion: string | undefined;

/**
 * 获取 CLI 版本号（从 package.json 读取）
 */
export function getVersion(): string {
  if (cachedVersion) return cachedVersion;

  const packageJsonPath = join(import.meta.dir, "..", "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version: string };
  cachedVersion = packageJson.version;
  return cachedVersion;
}

/**
 * 计算字符串的终端显示宽度
 * 中文字符占2格，ASCII字符占1格
 */
export function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    if (/[一-鿿]/.test(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 按显示宽度截断字符串
 */
export function truncateByDisplayWidth(str: string, maxWidth: number): string {
  let result = '';
  let width = 0;
  for (const char of str) {
    const charWidth = /[一-鿿]/.test(char) ? 2 : 1;
    if (width + charWidth > maxWidth) {
      break;
    }
    result += char;
    width += charWidth;
  }
  return result;
}

/**
 * 格式化流量/字节数字
 * 9900 -> 9.9k
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1000) {
    return `${(bytes / 1000).toFixed(1)}k`;
  }
  return String(bytes);
}

/**
 * 格式化耗时
 * 1234 -> 1.2s
 * 56789 -> 56.8s
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}