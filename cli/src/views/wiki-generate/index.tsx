/**
 * WikiGeneratePage - Wiki 文档生成页面
 *
 * 两个核心 TUI：
 * 1. 目录生成
 * 2. 文章生成列表
 */

import { Box, Text, useInput } from "ink";
import CatalogSection from "./pages/catalog-section";
import ArticlesSection from "./pages/articles-section";
import { useWiki } from "../../provider";
import { useI18n } from "../../i18n";
import type { Status } from "./types";

export default function WikiGeneratePage() {
  const { t } = useI18n();
  const { wikiCatalog } = useWiki();

  // 目录状态：等待生成
  const catalogStatus: Status = "waiting";

  // 文章状态：使用真实 wikiCatalog 或空数组
  const pages = wikiCatalog?.pages || [];

  // 键盘输入
  useInput((input) => {
    if (input === "r") {
      // TODO: 重试失败任务
    }
  });

  return (
    <Box flexDirection="column">
      {/* 目录生成 */}
      <CatalogSection status={catalogStatus} />

      {/* 文章生成（仅在 wikiCatalog 存在时显示） */}
      {pages.length > 0 && (
        <ArticlesSection pages={pages} statusMap={{}} trafficMap={{}} />
      )}

      {/* 无 catalog 提示 */}
      {pages.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>{t("wikiGenerate.noCatalog")}</Text>
        </Box>
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
