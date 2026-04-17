/**
 * Wiki Types
 *
 * Wiki page definitions and output format
 */

/**
 * WikiPage - Wiki page definition
 */
export interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  level: string;
  type?: 'overview' | 'architecture' | 'code' | 'spec' | 'reference';
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