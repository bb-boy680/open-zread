/**
 * ArticlesSection - 文章生成部分
 *
 * 显示文章列表（SelectInput）
 *
 * 架构：
 * - 纯渲染组件，只接收 props
 * - 使用 memo 避免不必要重渲染
 * - 内部使用 PageStatusRow 组件
 */

import { Box, Text } from "ink";
import { useMemo, memo, useCallback } from "react";
import SelectInput from "ink-select-input";
import Divider from "../../../components/Divider";
import StatusRow from "../../../components/StatusRow";
import StatusIcon from "../../../components/StatusIcon";
import { useI18n } from "../../../i18n";
import { formatBytes } from "../../../utils";
import { theme } from "../../../theme";
import type { WikiPage, PageStatus } from "../types";

interface ArticlesSectionProps {
  pages: WikiPage[];
  statusMap: Record<string, PageStatus>;
  onSelect?: (slug: string) => void;
}

const ArticlesSection = memo(function ArticlesSection({
  pages,
  statusMap,
  onSelect,
}: ArticlesSectionProps) {
  const { t } = useI18n();

  // 缓存 slug → page 的映射
  const pageMap = useMemo(
    () => new Map(pages.map((p) => [p.slug, p])),
    [pages]
  );

  // 统计完成数量
  const completedCount = useMemo(
    () => pages.filter((p) => statusMap[p.slug]?.status === "completed").length,
    [pages, statusMap]
  );

  const totalCount = pages.length;
  const articlesTitle = t("wikiGenerate.articlesTitle", {
    current: completedCount,
    total: totalCount,
  });

  // 缓存 selectItems
  const selectItems = useMemo(
    () => pages.map((page) => ({ label: page.slug, value: page.slug })),
    [pages]
  );

  // 缓存 indicatorComponent
  const indicatorComponent = useCallback(
    ({ isSelected }: { isSelected?: boolean }) => (
      <Text color={isSelected ? theme.primary : theme.muted}>
        {isSelected ? ">" : " "}
      </Text>
    ),
    []
  );

  // 缓存 itemComponent
  const itemComponent = useCallback(
    ({
      isSelected,
      label,
    }: {
      isSelected?: boolean;
      label: string;
    }) => {
      const page = pageMap.get(label);
      if (!page) return null;

      const status = statusMap[label]?.status || "waiting";
      const pageState = statusMap[label];
      const statusText = t(`wikiGenerate.${status}`);

      // 右栏
      let rightText = `[${statusText}]`;
      if (status === "loading" && pageState?.usage) {
        if (pageState.usage.input_tokens > 0) {
          rightText += ` ↑${formatBytes(pageState.usage.input_tokens)}`;
        }
        if (pageState.usage.output_tokens > 0) {
          rightText += ` ↓${formatBytes(pageState.usage.output_tokens)}`;
        }
      }

      const rightColor =
        status === "loading"
          ? isSelected ? theme.primary : theme.warning
          : status === "failed" ? theme.error : theme.muted;

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
        <Box height={1}>
          <StatusRow left={left} right={right} />
        </Box>
      );
    },
    [pageMap, statusMap, t]
  );

  // 缓存 onSelect 回调
  const handleSelect = useCallback(
    (item: { value: string }) => onSelect?.(item.value),
    [onSelect]
  );

  return (
    <Box flexDirection="column">
      <Divider title={articlesTitle} />
      <Box marginTop={1}>
        <SelectInput
          items={selectItems}
          onSelect={handleSelect}
          indicatorComponent={indicatorComponent}
          itemComponent={itemComponent}
        />
      </Box>
    </Box>
  );
});

export default ArticlesSection;