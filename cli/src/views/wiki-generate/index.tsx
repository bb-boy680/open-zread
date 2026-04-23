/**
 * WikiGeneratePage - Wiki 文档生成页面
 *
 * 纯 UI 组件，业务逻辑在 hooks 中处理。
 */

import { Box, Text, useInput } from "ink";
import CatalogSection from "./pages/catalog-section";
import ArticlesSection from "./pages/articles-section";
import { useWiki } from "../../provider";
import { useI18n } from "../../i18n";
import { useWikiCatalogGenerate } from "./hooks/useWikiCatalogGenerate";

export default function WikiGeneratePage() {
  const { t } = useI18n();
  const { wikiCatalog, reload } = useWiki();

  // 使用目录生成 hook
  const { catalogProgress, retryGenerate } = useWikiCatalogGenerate({
    hasWikiCatalog: Boolean(wikiCatalog),
    onComplete: reload,
  });

  // 文章列表
  const pages = wikiCatalog?.pages || [];

  // 键盘输入
  useInput((input) => {
    if (input === "r" && catalogProgress.status === "failed") {
      retryGenerate();
    }
  });

  return (
    <Box flexDirection="column">
      {/* 目录生成 */}
      <CatalogSection progress={catalogProgress} />

      {/* 文章生成（仅在 wikiCatalog 存在时显示） */}
      {pages.length > 0 && (
        <ArticlesSection pages={pages} statusMap={{}} trafficMap={{}} />
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
