/**
 * WikiGeneratePage - Wiki 文档生成页面
 *
 * 架构：
 * - 使用 useWikiGenerate 组合 Hook
 * - 使用 CatalogSection 和 ArticlesSection 组件
 * - 最小化页面层逻辑，只做组装
 *
 * URL 参数：
 * - mode=generate: 新生成（wiki.json 不存在）
 * - mode=continue: 继续生成（wiki.json 存在，文档未完成）
 * - mode=manage: 管理文档（wiki.json 存在，文档已完成，可重新生成单个）
 * - mode=force: 强制重新生成（忽略现有 wiki.json）
 */

import { Box, Text, useInput } from "ink";
import { useRef } from "react";
import { useSearchParams } from "react-router";
import { CatalogSection, ArticlesSection } from "./components";
import { useWikiGenerate } from "./hooks";
import { useI18n } from "../../i18n";

export default function WikiGeneratePage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") as "generate" | "continue" | "manage" | "force" | null;

  // 选中状态跟踪（用 ref，不需要触发重渲染）
  const selectedSlugRef = useRef<string | null>(null);

  const { state, actions, derived } = useWikiGenerate({
    forceRegenerate: mode === "force",
  });

  // 键盘导航
  useInput((input, _key) => {
    // 目录失败时按 r 重新生成目录
    if (input === "r" && state.catalog.status === "failed") {
      actions.retryCatalog();
      return;
    }

    // 选中文章时按 r 重新生成该文章
    if (input === "r" && selectedSlugRef.current) {
      actions.regeneratePage(selectedSlugRef.current);
    }
  });

  // 处理文章高亮（按 ↑/↓ 导航，实时跟踪）
  const handleArticleHighlight = (slug: string) => {
    selectedSlugRef.current = slug;
  };

  return (
    <Box flexDirection="column">
      {/* 目录生成部分 */}
      <CatalogSection state={state.catalog} />

      {/* 文章生成部分（目录完成后显示） */}
      {derived.catalogCompleted && state.wikiPages.length > 0 && (
        <ArticlesSection
          pages={state.wikiPages}
          statusMap={state.articles.pages}
          onHighlight={handleArticleHighlight}
        />
      )}

      {/* 底部导航 */}
      <Box marginTop={1}>
        <Text dimColor>
          ↑/↓: {t("wikiGenerate.navigate")} | r: {t("wikiGenerate.retry")} |
          ctrl+c: {t("wikiGenerate.exit")}
        </Text>
      </Box>
    </Box>
  );
}