import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useInView } from "react-intersection-observer";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";
import { Maximize2 } from "lucide-react";
import type { CodeReference } from "@/types/wiki";
import { useTableOfContents } from "@/hooks/useTableOfContents";
import { parseReferences } from "@/utils/parseReferences";
import { useTocContext } from "@/context/TocContext";
import { MermaidPreviewModal } from "./MermaidPreviewModal";

const CodeBlockContext = createContext(false);

// 移除 Markdown frontmatter (元数据)
function removeFrontmatter(content: string): string {
  // 匹配 --- 开头的 YAML frontmatter
  const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n?/;
  return content.replace(frontmatterRegex, "").trimStart();
}

interface MarkdownRendererProps {
  content: string;
  onReferencesFound: (refs: CodeReference[]) => void;
  onHeadingsExtracted?: (
    headings: { id: string; text: string; level: number }[],
  ) => void;
}

function HeadingWrapper({
  id,
  level,
  children,
  className,
}: {
  id?: string;
  level: number;
  children: React.ReactNode;
  className: string;
}) {
  const { registerHeading, unregisterHeading, setInView } = useTocContext();
  const { ref, inView, entry } = useInView({ threshold: 0, rootMargin: "0px" });
  const Tag = `h${level}` as const;

  useEffect(() => {
    if (!id) return;
    registerHeading(id);
    return () => unregisterHeading(id);
  }, [id, registerHeading, unregisterHeading]);

  useEffect(() => {
    if (!id) return;
    setInView(id, inView);
  }, [id, inView, setInView]);

  if (id) {
    return (
      <div
        ref={ref}
        data-heading-id={id}
        data-heading-top={entry?.boundingClientRect.top ?? 0}
      >
        <Tag id={id} className={className}>
          {children}
        </Tag>
      </div>
    );
  }

  return <Tag className={className}>{children}</Tag>;
}

function MermaidDiagram({
  codeContent,
  onExpand,
}: {
  codeContent: string;
  onExpand: () => void;
}) {
  return (
    <div
      className="mermaid-card my-6"
      role="button"
      tabIndex={0}
      aria-label="放大查看 Mermaid 图表"
      onClick={onExpand}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <button
        type="button"
        className="mermaid-expand-button"
        aria-label="放大查看 Mermaid 图表"
        onClick={(event) => {
          event.stopPropagation();
          onExpand();
        }}
      >
        <Maximize2 size={16} />
      </button>
      <div className="mermaid-card-body">
        <div className="mermaid mermaid-diagram">{codeContent}</div>
      </div>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  onReferencesFound,
  onHeadingsExtracted,
}: MarkdownRendererProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const headings = useTableOfContents(content);
  const [activeMermaid, setActiveMermaid] = useState<string | null>(null);

  useEffect(() => {
    onReferencesFound(parseReferences(content));
  }, [content, onReferencesFound]);

  useEffect(() => {
    if (onHeadingsExtracted && headings.length > 0) {
      onHeadingsExtracted(headings);
    }
  }, [headings, onHeadingsExtracted]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
  }, []);

  const renderMermaid = useCallback(() => {
    if (mermaidRef.current) {
      const nodes = mermaidRef.current.querySelectorAll(".mermaid");
      if (nodes.length > 0) {
        mermaid.run({ nodes });
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(renderMermaid, 100);
    return () => clearTimeout(timer);
  }, [content, renderMermaid]);

  useEffect(() => {
    if (!mermaidRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      renderMermaid();
    });

    resizeObserver.observe(mermaidRef.current);
    return () => resizeObserver.disconnect();
  }, [renderMermaid]);

  return (
    <div ref={mermaidRef} className="prose prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          pre: ({ children }) => (
            <CodeBlockContext.Provider value>
              <>{children}</>
            </CodeBlockContext.Provider>
          ),
          code({ className, children, ...props }) {
            const isBlockCode = useContext(CodeBlockContext);
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1] ?? (isBlockCode ? "txt" : "");
            const codeContent = String(children).replace(/\n$/, "");

            if (isBlockCode && language === "mermaid") {
              return (
                <MermaidDiagram
                  codeContent={codeContent}
                  onExpand={() => setActiveMermaid(codeContent)}
                />
              );
            }

            if (isBlockCode) {
              return (
                <div className="my-6 rounded-lg overflow-hidden bg-[#1e1e2e]">
                  <div className="px-4 py-2 bg-[#2d2d3d] border-b border-gray-700">
                    <span className="text-xs text-gray-500 uppercase">
                      {language}
                    </span>
                  </div>
                  <div className="p-4 overflow-auto">
                    <SyntaxHighlighter
                      PreTag="div"
                      language={language}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: "transparent",
                        fontSize: "14px",
                        lineHeight: "1.6",
                      }}
                      showLineNumbers
                    >
                      {codeContent}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-pink-600"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <HeadingWrapper
              level={1}
              className="text-4xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200"
            >
              {children}
            </HeadingWrapper>
          ),
          h2: ({ children, id }) => (
            <HeadingWrapper
              level={2}
              id={id}
              className="text-2xl font-semibold text-gray-900 mt-8 mb-4 scroll-mt-20"
            >
              {children}
            </HeadingWrapper>
          ),
          h3: ({ children, id }) => (
            <HeadingWrapper
              level={3}
              id={id}
              className="text-xl font-semibold text-gray-900 mt-6 mb-3 scroll-mt-20"
            >
              {children}
            </HeadingWrapper>
          ),
          h4: ({ children, id }) => (
            <HeadingWrapper
              level={4}
              id={id}
              className="text-lg font-semibold text-gray-900 mt-4 mb-2 scroll-mt-20"
            >
              {children}
            </HeadingWrapper>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside text-gray-700 mb-4 space-y-2 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside text-gray-700 mb-4 space-y-2 pl-5">
              {children}
            </ol>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-cyan-600 underline hover:text-cyan-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full rounded-lg my-4 border border-gray-200"
            />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border border-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
              {children}
            </td>
          ),
        }}
      >
        {removeFrontmatter(content)}
      </ReactMarkdown>
      <MermaidPreviewModal
        open={activeMermaid !== null}
        content={activeMermaid ?? ""}
        onOpenChange={(open) => {
          if (!open) setActiveMermaid(null);
        }}
      />
    </div>
  );
}
