import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useWiki } from '@/hooks/useWiki';
import type { CodeReference } from '@/types/wiki';

interface SourceCodeModalProps {
  open: boolean;
  reference: CodeReference | null;
  onClose: () => void;
}

// 根据文件扩展名推断语言
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'go': 'go',
    'rs': 'rust',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'vue': 'vue',
    'md': 'markdown',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return languageMap[ext || ''] || 'typescript';
}

export function SourceCodeModal({ open, reference, onClose }: SourceCodeModalProps) {
  const { loadSourceCode } = useWiki();
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载完整文件代码
  useEffect(() => {
    if (!open || !reference) return;

    const loadCode = async () => {
      setLoading(true);
      setError(null);
      try {
        // 不传行号参数，获取完整文件
        const result = await loadSourceCode(reference.filePath);
        if (result) {
          setCode(result);
        } else {
          setError('无法加载代码');
        }
      } catch (err) {
        setError(`加载失败: ${err instanceof Error ? err.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    loadCode();
  }, [open, reference, loadSourceCode]);

  // 自动滚动到高亮区域
  useEffect(() => {
    if (code && reference?.lineStart && containerRef.current) {
      // 等待渲染完成后滚动
      const timer = setTimeout(() => {
        const highlightStart = containerRef.current?.querySelector('[data-highlight-start="true"]');
        if (highlightStart) {
          highlightStart.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [code, reference]);

  // ESC 键退出
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !reference) return null;

  const language = getLanguageFromPath(reference.filePath);
  // 只有在有行号时才使用，否则不高亮
  const hasLineNumbers = reference.lineStart !== undefined;
  const lineStart = reference.lineStart || 1;
  const lineEnd = reference.lineEnd || lineStart;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-[calc(100%-64px)] h-[calc(100%-64px)] bg-[#1e1e2e] rounded-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#2d2d3d] border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-mono">
              {reference.filePath}
            </span>
            {hasLineNumbers && (
              <span className="text-xs text-gray-500">
                #L{lineStart}{lineEnd !== lineStart && `-L${lineEnd}`}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Code Area */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-full text-gray-400">
              加载中...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-400">
              {error}
            </div>
          )}
          {!loading && !error && code && (
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              wrapLines={true}
              showLineNumbers={true}
              customStyle={{
                margin: 0,
                padding: 0,
                background: 'transparent',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
              lineProps={(lineNumber: number) => {
                if (!hasLineNumbers) {
                  return {};
                }
                const isHighlighted = lineNumber >= lineStart && lineNumber <= lineEnd;
                const isFirstHighlighted = lineNumber === lineStart;
                return {
                  'data-highlight': isHighlighted ? 'true' : undefined,
                  'data-highlight-start': isFirstHighlighted ? 'true' : undefined,
                  style: isHighlighted
                    ? { background: 'rgba(0, 117, 222, 0.15)', display: 'block' }
                    : {},
                };
              }}
            >
              {code}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </div>
  );
}