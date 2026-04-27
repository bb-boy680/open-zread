/**
 * CatalogSection - 目录生成状态显示
 *
 * 显示格式：
 * - ○ [等待]
 * - ⠴ [请求中]
 * - ⠴ [工具: xxx] ↑↑ ↓↓
 * - ⠴ [响应中] ↑↑ ↓↓
 * - ✓ [完成] ↑↑ ↓↓ 1.2s
 * - ✗ [失败] error
 *
 * 架构：
 * - 纯渲染组件，只接收 props
 * - Divider 显示标题，状态行只显示图标+状态
 */

import { Box, Text } from "ink";
import Divider from "../../../components/Divider";
import StatusRow from "../../../components/StatusRow";
import StatusIcon from "../../../components/StatusIcon";
import { useI18n } from "../../../i18n";
import { formatBytes, formatDuration } from "../../../utils";
import { theme } from "../../../theme";
import type { CatalogState } from "../types";

interface CatalogSectionProps {
  state: CatalogState;
}

export default function CatalogSection({ state }: CatalogSectionProps) {
  const { t } = useI18n();

  const { status, phase, currentTool, usage, durationMs, error } = state;

  // 构建状态文字
  let statusText: string;
  if (status === "loading" && phase === "tool" && currentTool) {
    // 工具调用
    const toolDisplay = currentTool.replace(/_/g, " ").replace(/^get /, "");
    statusText = t("wikiGenerate.tool", { name: toolDisplay });
  } else if (status === "loading") {
    // requesting/responding/scanning/解析 → 统一显示请求中
    statusText = t("wikiGenerate.requesting");
  } else if (status === "failed" && error) {
    statusText = error;
  } else {
    statusText = t(`wikiGenerate.${status}`);
  }

  // 右栏：状态 + Token
  let rightText = `[${statusText}]`;

  // loading 状态显示 Token（累计显示）
  if (status === "loading" && usage) {
    if (usage.input_tokens > 0) {
      rightText += ` ↑${formatBytes(usage.input_tokens)}`;
    }
    if (usage.output_tokens > 0) {
      rightText += ` ↓${formatBytes(usage.output_tokens)}`;
    }
  }

  // completed 状态显示耗时和 Token
  if (status === "completed") {
    if (durationMs !== undefined) rightText += ` ${formatDuration(durationMs)}`;
    if (usage) {
      if (usage.input_tokens > 0) {
        rightText += ` ↑${formatBytes(usage.input_tokens)}`;
      }
      if (usage.output_tokens > 0) {
        rightText += ` ↓${formatBytes(usage.output_tokens)}`;
      }
    }
  }

  const rightColor =
    status === "loading" ? theme.warning :
    status === "completed" ? theme.success :
    status === "failed" ? theme.error :
    theme.muted;
  const right = <Text color={rightColor}>{rightText}</Text>;

  // 左栏：只有图标，标题由 Divider 显示
  const left = (
    <Box>
      <StatusIcon status={status} />
    </Box>
  );

  return (
    <Box flexDirection="column">
      <Divider title={t("wikiGenerate.catalogTitle")} />
      <StatusRow left={left} right={right} />
    </Box>
  );
}