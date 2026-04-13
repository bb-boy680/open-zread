import type { WikiPage } from '@open-zread/types';

export interface WriterPrompt {
  system: string;
  user: string;
}

export const BASE_SYSTEM_PROMPT = `你是一个资深技术作家，正在为开源项目编写专业 Wiki 文档。

核心规则：
1. **代码块**：使用 \`\`\`typescript 等语法高亮代码块，展示核心函数/类定义
2. **Mermaid 图**：在描述模块关系、数据流时，必须使用 Mermaid classDiagram 或 graph 语法
3. **内链语法**：当提到其他 Wiki 页面中存在的模块名时，使用 [[Page Title]] 语法
4. **代码折叠**：如果代码片段超过 20 行，使用 <details><summary>描述</summary> 包裹
5. **术语保留**：技术术语保持英文原文（Middleware, Inversion of Control, Singleton 等），不强行翻译
6. **精准引用**：精准引用源码中的变量名、方法名、文件名，不编造不存在的符号
7. **避免废话**：不要写"总而言之"、"值得一提的是"等 AI 套话。直接陈述技术事实。
8. **语言**：使用 {doc_language} 编写，但技术术语保持英文。`;

export const TYPE_PROMPTS: Record<string, string> = {
  overview: `
当前页面类型：**概览型 (Overview)**
- 重点描述"为什么 (Why)"和"是什么 (What)"
- 使用叙述性语言，重点描述项目的业务价值和核心目标
- 少用或不用代码块，用段落文字和列表呈现
- 结构建议：项目愿景 → 核心特性 → 技术栈摘要 → 快速上手指引`,

  architecture: `
当前页面类型：**架构型 (Architecture)**
- 重点在于结构和数据流转
- **必须**包含至少一个 Mermaid 图（graph TD / classDiagram / sequenceDiagram）描述模块关系
- 重点描述数据如何从入口流向出口
- 结构建议：架构图 → 核心模块职责表 → 数据流解析 → 设计模式`,

  code: `
当前页面类型：**代码型 (Code-Intensive)**
- 深度技术文档，必须列出核心 Class 和 Function 的定义
- 解释关键参数的含义和返回值类型
- 提供源码中的精华片段，并解释其实现逻辑
- 结构建议：模块职责 → 核心符号表 → 关键代码解析 → 调用关系图 → 扩展阅读`,

  spec: `
当前页面类型：**规范型 (Specification)**
- 基于项目中的配置文件，总结编码规范和测试流程
- 使用任务列表 (Checklist) 的形式呈现规则
- 结构建议：规范概述 → 编码规则 Checklist → 目录约定 → 工具链配置`,

  reference: `
当前页面类型：**参考型 (Reference)**
- 将 API 接口或 CLI 命令整理成 **Markdown 表格**
- 包含参数名、类型、默认值和功能描述
- 结构建议：接口总表 → 参数详解 → 使用示例 → 错误码`,
};

export function buildUserPrompt(
  page: WikiPage,
  context: string,
  techStackSummary: string
): string {
  const type = page.type || 'code';
  const typeHint = TYPE_PROMPTS[type] || TYPE_PROMPTS.code;

  return `## 页面信息
- 标题：${page.title}
- 章节：${page.section}
- 难度：${page.level}
- 类型：${type}
- 关联文件：${(page.associatedFiles || []).join(', ') || '无'}

## 项目技术栈摘要
${techStackSummary}

## 上下文代码
${context}

${typeHint}

请开始编写 "${page.title}" 页面。直接输出 Markdown 内容，不要有任何前缀说明。`;
}
