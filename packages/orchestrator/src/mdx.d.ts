/**
 * MDX 模块类型声明
 *
 * 允许将 .mdx 文件作为字符串模块导入。
 */

declare module '*.mdx' {
  const content: string;
  export default content;
}