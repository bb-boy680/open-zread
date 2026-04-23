/**
 * CatalogSection - 目录生成状态显示
 *
 * 显示格式：
 * - ○ 目录 [等待]
 * - ⠴ 目录 [请求中]
 * - ⠴ 目录 [工具: xxx] ↑↑ ↓↓
 * - ⠴ 目录 [响应中] ↑↑ ↓↓
 * - ✓ 目录 [完成] ↑↑ ↓↓ 1.2s
 * - ✗ 目录 [失败] error
 */

import { Box, Text } from "ink";
import Divider from "../../../../components/Divider";
import StatusRow from "../../../../components/StatusRow";
import StatusIcon from "../../../../components/StatusIcon";
import { useI18n } from "../../../../i18n";
import { formatBytes, formatDuration } from "../../../../utils";
import { theme } from "../../../../theme";
import type { CatalogProgress } from "../../types";

interface CatalogSectionProps {
  progress: CatalogProgress;
}

export default function CatalogSection({ progress }: CatalogSectionProps) {
  const { t } = useI18n();

  const { status, phase, currentTool, upBytes, downBytes, durationMs, error } = progress;

  // 构建状态文字
  let statusText: string;
  if (status === "loading" && phase === "tool" && currentTool) {
    // 工具调用
    const toolDisplay = currentTool.replace(/_/g, " ").replace(/^get /, "");
    statusText = t("wikiGenerate.tool", { name: toolDisplay });
  } else if (status === "loading") {
    // requesting/responding/扫描/解析 → 统一显示请求中
    statusText = t("wikiGenerate.requesting");
  } else if (status === "failed" && error) {
    statusText = error;
  } else {
    statusText = t(`wikiGenerate.${status}`);
  }

  // 右栏：状态 + Token
  let rightText = `[${statusText}]`;

  // loading 状态显示 Token（仅工具调用和响应中）
  if (status === "loading" && (phase === "tool" || phase === "responding")) {
    if (upBytes !== undefined) rightText += ` ↑${formatBytes(upBytes)}`;
    if (downBytes !== undefined) rightText += ` ↓${formatBytes(downBytes)}`;
  }

  // completed 状态显示耗时和 Token
  if (status === "completed") {
    if (durationMs !== undefined) rightText += ` ${formatDuration(durationMs)}`;
    if (upBytes !== undefined) rightText += ` ↑${formatBytes(upBytes)}`;
    if (downBytes !== undefined) rightText += ` ↓${formatBytes(downBytes)}`;
  }

  const rightColor =
    status === "loading" ? theme.warning :
    status === "failed" ? theme.error :
    theme.muted;
  const right = <Text color={rightColor}>{rightText}</Text>;

  // 左栏
  const left = (
    <Box>
      <Text> </Text>
      <StatusIcon status={status} />
      <Text> {t("wikiGenerate.catalogTitle")}</Text>
    </Box>
  );

  return (
    <Box flexDirection="column">
      <Divider title={t("wikiGenerate.catalogTitle")} />
      <Box marginTop={1}>
        <StatusRow left={left} right={right} />
      </Box>
    </Box>
  );
}
