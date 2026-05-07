import { useState, useMemo } from "react";
import { useWiki } from "@/hooks/useWiki";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TableOfContents } from "./TableOfContents";
import { TocProvider } from "@/context/TocContext";
import { Clock, Signal } from "lucide-react";
import type { TocItem } from "@/hooks/useTableOfContents";

/**
 * 计算阅读时间（分钟）
 * 中文约 350 字/分钟，英文约 200 词/分钟
 */
function calculateReadingTime(content: string): number {
  if (!content) return 0;

  // 移除 markdown 标记（代码块、链接等）
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]+`/g, '') // 移除行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 保留链接文本
    .replace(/[#*_~>|]/g, '') // 移除 markdown 符号
    .replace(/\n+/g, ' ') // 换行转空格
    .trim();

  // 统计中文字符数
  const chineseChars = (cleanContent.match(/[一-龥]/g) || []).length;
  // 统计英文单词数（连续字母为一个单词）
  const englishWords = (cleanContent.match(/[a-zA-Z]+/g) || []).length;

  // 中文阅读速度：350 字/分钟，英文：200 词/分钟
  const chineseMinutes = chineseChars / 350;
  const englishMinutes = englishWords / 200;

  const totalMinutes = chineseMinutes + englishMinutes;

  // 最少 1 分钟，向上取整
  return Math.max(1, Math.ceil(totalMinutes));
}

export function WikiContent() {
  const { currentPage, currentContent } = useWiki();
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  const readingTime = useMemo(
    () => calculateReadingTime(currentContent || ''),
    [currentContent]
  );

  if (!currentPage) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        选择一个文档开始阅读
      </div>
    );
  }

  return (
    <TocProvider>
      <div className="w-full">
        <div className="flex gap-8 px-8 py-6 mx-auto">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <span className="text-cyan-600 hover:underline cursor-pointer">
                {currentPage.section}
              </span>
              <span>/</span>
              <span>{currentPage.title}</span>
            </div>

            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {currentPage.title}
              </h1>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-emerald-500" />
                  <span>{readingTime} 分钟</span>
                </div>
                <div className="flex items-center gap-2">
                  <Signal size={16} className="text-amber-500" />
                  <span>
                    等级:{" "}
                    {currentPage.level === "Beginner"
                      ? "入门"
                      : currentPage.level === "Intermediate"
                        ? "中级"
                        : "高级"}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative overflow-visible">
              <MarkdownRenderer
                content={currentContent}
                onReferencesFound={() => {}}
                onHeadingsExtracted={setTocItems}
              />
            </div>
          </div>

          <div className="w-16 shrink-0 sticky top-0 h-screen overflow-visible flex items-start justify-end pt-6">
            <TableOfContents items={tocItems} />
          </div>
        </div>
      </div>
    </TocProvider>
  );
}
