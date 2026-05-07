// apps/browse/src/components/CodePanel.tsx
import { useState, useEffect } from 'react';
import { useWiki } from '@/hooks/useWiki';
import { FolderTree, FileCode, X, Menu, ChevronLeft } from 'lucide-react';
import type { CodeReference } from '@/types/wiki';

export function CodePanel() {
  const { rightPanelCollapsed, toggleRightPanel, references, activeReference, selectReference, loadSourceCode } = useWiki();
  const [codeMap, setCodeMap] = useState<Map<string, string>>(new Map());

  // Load code for active reference
  useEffect(() => {
    if (activeReference && !codeMap.has(activeReference.filePath)) {
      loadSourceCode(activeReference.filePath, activeReference.lineStart, activeReference.lineEnd)
        .then((code) => {
          if (code) {
            setCodeMap((prev) => new Map(prev).set(activeReference.filePath, code));
          }
        });
    }
  }, [activeReference, codeMap, loadSourceCode]);
  if (rightPanelCollapsed) {
    return (
      <div className="w-12 h-full bg-white border-l border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={toggleRightPanel}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
      </div>
    );
  }

  const activeCode = activeReference ? codeMap.get(activeReference.filePath) : null;

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>
        <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
          <Menu size={20} />
        </button>
      </div>

      {/* Sources Section */}
      <div className="px-4 py-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <FolderTree size={18} />
            <span className="font-semibold text-sm">来源</span>
          </div>
          <span className="text-xs text-gray-400">
            {references.length > 0 ? `${references.length} 个引用` : '概述'}
          </span>
        </div>
      </div>

      {/* References List */}
      <div className="flex-1 overflow-auto px-4">
        {references.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
            当前页面没有代码引用
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3">
            {references.map((reference, idx) => (
              <ReferenceItem
                key={idx}
                reference={reference}
                isActive={activeReference?.filePath === reference.filePath}
                onClick={() => selectReference(reference)}
              />
            ))}
          </div>
        )}

        {/* Code Preview for active reference */}
        {activeReference && activeCode && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-400 mb-2 font-mono">
              {activeReference.fileName}
              {activeReference.lineStart && (
                <span className="text-gray-600">
                  #L{activeReference.lineStart}
                  {activeReference.lineEnd && activeReference.lineEnd !== activeReference.lineStart &&
                    `-L${activeReference.lineEnd}`}
                </span>
              )}
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-64 font-mono leading-relaxed">
              {activeCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

interface ReferenceItemProps {
  reference: CodeReference;
  isActive: boolean;
  onClick: () => void;
}

function ReferenceItem({ reference, isActive, onClick }: ReferenceItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 py-2 px-2 text-sm cursor-pointer rounded-md ${
        isActive
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <FileCode size={14} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
      <span className={`truncate ${isActive ? 'font-medium' : ''}`}>
        {reference.fileName}
      </span>
      {reference.lineStart && (
        <span className="text-xs text-gray-400 ml-auto">
          L{reference.lineStart}
        </span>
      )}
    </div>
  );
}
