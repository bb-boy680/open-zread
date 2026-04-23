/**
 * ArticlesSection - 文章生成部分
 *
 * 显示文章列表（SelectInput）
 */

import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Divider from "../../../../components/Divider";
import StatusRow from "../../../../components/StatusRow";
import StatusIcon from "../../../../components/StatusIcon";
import { useI18n } from "../../../../i18n";
import { formatBytes } from "../../../../utils";
import { theme } from "../../../../theme";
import type { WikiPage } from "@open-zread/types";
import type { Status } from "../../types";

interface ArticlesSectionProps {
  pages: WikiPage[];
  statusMap: Record<string, Status>;
  trafficMap?: Record<string, { up: number; down: number }>;
  onSelect?: (slug: string) => void;
}

function countCompleted(
  pages: WikiPage[],
  statusMap: Record<string, Status>,
): number {
  return pages.filter((p) => statusMap[p.slug] === "completed").length;
}

export default function ArticlesSection({
  pages,
  statusMap,
  trafficMap,
  onSelect,
}: ArticlesSectionProps) {
  const { t } = useI18n();

  const completedCount = countCompleted(pages, statusMap);
  const totalCount = pages.length;
  const articlesTitle = t("wikiGenerate.articlesTitle", {
    current: completedCount,
    total: totalCount,
  });

  const selectItems = pages.map((page) => ({
    label: page.slug,
    value: page.slug,
  }));

  const indicatorComponent = ({ isSelected }: { isSelected?: boolean }) => (
    <Text color={isSelected ? theme.primary : theme.muted}>
      {isSelected ? ">" : " "}
    </Text>
  );

  const itemComponent = ({
    isSelected,
    label,
  }: {
    isSelected?: boolean;
    label: string;
  }) => {
    const page = pages.find((p) => p.slug === label);
    if (!page) return null;

    const status = statusMap[label] || "waiting";
    const traffic =
      status === "loading" && trafficMap ? trafficMap[label] : undefined;
    const statusText = t(`wikiGenerate.${status}`);

    // 右栏
    let rightText = `[${statusText}]`;
    if (status === "loading" && traffic) {
      rightText += ` ↑${formatBytes(traffic.up)} ↓${formatBytes(traffic.down)}`;
    }

    const rightColor =
      status === "loading"
        ? isSelected
          ? theme.primary
          : theme.warning
        : status === "failed"
          ? theme.error
          : theme.muted;

    const right = <Text color={rightColor}>{rightText}</Text>;

    // 左栏
    const left = (
      <Box>
        <StatusIcon
          status={status}
          variant={isSelected ? "active" : "default"}
        />
        <Text bold={isSelected}> {page.title}</Text>
      </Box>
    );

    return (
      <Box height={2}>
        <StatusRow left={left} right={right} />
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Divider title={articlesTitle} />
      <Box marginTop={1}>
        <SelectInput
          items={selectItems}
          onSelect={(item) => onSelect?.(item.value)}
          indicatorComponent={indicatorComponent}
          itemComponent={itemComponent}
        />
      </Box>
    </Box>
  );
}
