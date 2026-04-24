/**
 * Wiki Generate Hooks
 *
 * 导出所有 Wiki 生成相关 Hook：
 * - useCatalogGenerate: 目录生成
 * - useArticlesGenerate: 文章生成
 * - useWikiGenerate: 组合层（推荐使用）
 */

// 新架构 Hook
export { useCatalogGenerate } from './use-catalog';
export { useArticlesGenerate } from './use-articles';
export { useWikiGenerate } from './use-wiki-generate';

// 兼容旧命名（过渡期）
export { useCatalogGenerate as useWikiCatalogGenerate } from './use-catalog';