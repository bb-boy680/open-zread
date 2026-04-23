/**
 * CatalogSection - 目录生成部分
 *
 * 显示目录生成状态
 */

import { Box, Text } from "ink";
import Divider from "../../../../components/Divider";
import StatusRow from "../../../../components/StatusRow";
import StatusIcon from "../../../../components/StatusIcon";
import { useI18n } from "../../../../i18n";
import { formatBytes } from "../../../../utils";
import { theme } from "../../../../theme";
import type { Status } from "../../types";

interface CatalogSectionProps {
  status: Status;
  upBytes?: number;
  downBytes?: number;
}

export default function CatalogSection({
  status,
  upBytes,
  downBytes,
}: CatalogSectionProps) {
  const { t } = useI18n();

  const catalogTitle = t("wikiGenerate.catalogTitle");
  const statusText = t(`wikiGenerate.${status}`);

  // 右栏
  let rightText = `[${statusText}]`;
  if (
    status === "loading" &&
    upBytes !== undefined &&
    downBytes !== undefined
  ) {
    rightText += ` ↑${formatBytes(upBytes)} ↓${formatBytes(downBytes)}`;
  }

  const rightColor = status === "loading" ? theme.warning : theme.muted;
  const right = <Text color={rightColor}>{rightText}</Text>;

  // 左栏（前缀空格对齐 indicator）
  const left = (
    <Box>
      <Text> </Text>
      <StatusIcon status={status} />
      <Text> {catalogTitle}</Text>
    </Box>
  );

  return (
    <Box flexDirection="column">
      <Divider title={catalogTitle} />
      <Box marginTop={1}>
        <StatusRow left={left} right={right} />
      </Box>
    </Box>
  );
}
