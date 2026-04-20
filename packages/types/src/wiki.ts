/**
 * Wiki Types
 *
 * Wiki page definitions and output format
 */

/**
 * Wiki 难度级别
 * - Beginner: 初学者，适合入门章节
 * - Intermediate: 中级，需要一定基础
 * - Advanced: 高级，适合深度技术章节
 */
export type WikiLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * WikiPage - Wiki page definition
 */
export interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  level: WikiLevel;
  /**
   * 关联的源文件或目录路径
   * - 文件路径: "packages/web-integration/src/index.ts"
   * - 目录路径: "packages/web-integration/src/" (以 / 结尾)
   * 后续生成 Wiki 内容时，会读取这些路径获取上下文
   */
  associatedFiles?: string[];
}

/**
 * WikiOutput - Final output
 */
export interface WikiOutput {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
  techStackSummary?: TechStackSummary;
}

/**
 * TechStackSummary - Technology stack analysis result
 */
export interface TechStackSummary {
  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
  };
  projectType: string;
  entryPoints: string[];
}