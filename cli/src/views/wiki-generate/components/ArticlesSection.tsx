/**
 * ArticlesSection - 文章生成部分
 *
 * 显示文章列表（SelectInput）
 *
 * 架构：
 * - 纯渲染组件，只接收 props
 * - 使用 memo 遌免不必要重渲染
 * - 内部使用 PageStatusRow 组件
 * - 重试状态支持实时倒计时
 */

import { Box, Text } from "ink";
import { useMemo, memo, useCallback, useState, useEffect, useRef } from "react";
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
  /** 高亮回调（按 ↑/↓ 导航时触发，用于跟踪当前选中项） */
  onHighlight?: (slug: string) => void;
}

/** 倒计时 Hook - 用于 retry 状态实时显示 */
function useCountdown(initialMs: number, isActive: boolean): number {
  const [seconds, setSeconds] = useState(Math.ceil(initialMs / 1000));
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!isActive || initialMs <= 0) {
      setSeconds(0);
      return;
    }

    setSeconds(Math.ceil(initialMs / 1000));
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.ceil((initialMs - elapsed) / 1000);
      setSeconds(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [initialMs, isActive]);

  return seconds;
}

const ArticlesSection = memo(function ArticlesSection({
  pages,
  statusMap,
  onHighlight,
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
      const phase = statusMap[label]?.phase;
      const currentTool = statusMap[label]?.currentTool;
      const pageState = statusMap[label];

      // 重试状态：实时倒计时
      const isRetrying = status === "loading" && phase === "retry";
      const delayMs = pageState?.delayMs || 10000;
      const retryCount = pageState?.retryCount ?? 1;
      const maxRetries = pageState?.maxRetries ?? 3;

      // 状态文字：根据 phase 显示详细状态
      let statusText: string;
      if (isRetrying) {
        // 重试状态：倒计时显示（由 CountdownRow 组件处理）
        statusText = ""; // 占位，实际由 CountdownRow 渲染
      } else if (status === "loading" && phase === "tool" && currentTool) {
        // 工具调用
        const toolDisplay = currentTool.replace(/_/g, " ").replace(/^get /, "");
        statusText = t("wikiGenerate.tool", { name: toolDisplay });
      } else if (status === "loading" && phase) {
        statusText = t(`wikiGenerate.${phase}`);
      } else if (status === "failed" && pageState?.error) {
        statusText = pageState.error;
      } else {
        statusText = t(`wikiGenerate.${status}`);
      }

      // 右栏：状态 + Token
      const rightColor =
        status === "loading"
          ? isSelected ? theme.primary : theme.warning
          : status === "completed" ? theme.success
          : status === "failed" ? theme.error
          : theme.muted;

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

      // 重试状态使用特殊组件（带倒计时）
      if (isRetrying) {
        return (
          <Box height={1}>
            <CountdownRow
              left={left}
              retryCount={retryCount}
              maxRetries={maxRetries}
              delayMs={delayMs}
              usage={pageState?.usage}
              color={rightColor}
            />
          </Box>
        );
      }

      // 普通状态
      let rightText = `[${statusText}]`;
      if (status === "loading" && pageState?.usage) {
        if (pageState.usage.input_tokens > 0) {
          rightText += ` ↑${formatBytes(pageState.usage.input_tokens)}`;
        }
        if (pageState.usage.output_tokens > 0) {
          rightText += ` ↓${formatBytes(pageState.usage.output_tokens)}`;
        }
      }

      const right = <Text color={rightColor}>{rightText}</Text>;

      return (
        <Box height={1}>
          <StatusRow left={left} right={right} />
        </Box>
      );
    },
    [pageMap, statusMap, t]
  );

  // 缓存 onHighlight 回调（实时跟踪选中项）
  const handleHighlight = useCallback(
    (item: { value: string }) => onHighlight?.(item.value),
    [onHighlight]
  );

  return (
    <Box flexDirection="column">
      <Divider title={articlesTitle} />
      <Box marginTop={1}>
        <SelectInput
          items={selectItems}
          onHighlight={handleHighlight}
          indicatorComponent={indicatorComponent}
          itemComponent={itemComponent}
        />
      </Box>
    </Box>
  );
});

/** 重试倒计时行组件 */
interface CountdownRowProps {
  left: React.ReactNode;
  retryCount: number;
  maxRetries: number;
  delayMs: number;
  usage?: { input_tokens: number; output_tokens: number };
  color: string;
}

function CountdownRow({ left, retryCount, maxRetries, delayMs, usage, color }: CountdownRowProps) {
  const { t } = useI18n();
  const seconds = useCountdown(delayMs, true);


  let rightText = `[${t("wikiGenerate.retrying", { n: retryCount, max: maxRetries, seconds })}]`;
  if (usage) {
    if (usage.input_tokens > 0) {
      rightText += ` ↑${formatBytes(usage.input_tokens)}`;
    }
    if (usage.output_tokens > 0) {
      rightText += ` ↓${formatBytes(usage.output_tokens)}`;
    }
  }

  return <StatusRow left={left} right={<Text color={color}>{rightText}</Text>} />;
}

export default ArticlesSection;