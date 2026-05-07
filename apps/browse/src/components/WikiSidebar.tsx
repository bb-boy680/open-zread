// apps/browse/src/components/WikiSidebar.tsx
import { useNavigate } from 'react-router';
import { useWiki } from '@/hooks/useWiki';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import type { TreeNode, WikiPage } from '@/types/wiki';

interface TreeItemProps {
  node: TreeNode;
  level?: number;
  onSelectPage: (page: WikiPage) => void;
}

function TreeItem({ node, level = 0, onSelectPage }: TreeItemProps) {
  const { currentPage, expandedNodes, toggleNode } = useWiki();
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const isActive = node.type === 'page' && currentPage?.slug === node.pageData?.slug;

  const handlePageClick = () => {
    if (node.type === 'page' && node.pageData) {
      onSelectPage(node.pageData);
    }
  };

  // Section: 醒目标题，不可点击，不展开
  if (node.type === 'section') {
    return (
      <div>
        <div
          className="py-2 text-sm font-semibold text-gray-900"
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
        >
          {node.title}
        </div>
        {hasChildren && (
          <div>
            {node.children!.map(child => (
              <TreeItem key={child.id} node={child} level={level + 1} onSelectPage={onSelectPage} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Group: 可展开的组
  if (node.type === 'group') {
    return (
      <div>
        <div
          onClick={() => hasChildren && toggleNode(node.id)}
          className="flex items-center justify-between py-2 px-2 rounded-md cursor-pointer text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
        >
          <span className="font-normal">{node.title}</span>
          {hasChildren && (
            <span className="text-gray-400">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => (
              <TreeItem key={child.id} node={child} level={level + 1} onSelectPage={onSelectPage} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Page: 普通页面项
  return (
    <div>
      <div
        onClick={handlePageClick}
        className={`
          py-2 px-2 rounded-md cursor-pointer text-sm
          transition-colors duration-150
          ${isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-700 hover:bg-gray-50'
          }
        `}
        style={{ paddingLeft: `${(level + 1) * 12}px` }}
      >
        <span className="font-normal">{node.title}</span>
      </div>
    </div>
  );
}

export function WikiSidebar() {
  const { tree, leftPanelCollapsed, toggleLeftPanel } = useWiki();
  const navigate = useNavigate();

  const handleSelectPage = (page: WikiPage) => {
    navigate(`/${page.slug}`);
  };

  if (leftPanelCollapsed) {
    return (
      <div className="w-12 h-full bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={toggleLeftPanel}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-blue-600" />
          <span className="font-semibold text-gray-900">Zread Wiki</span>
        </div>
        <button
          onClick={toggleLeftPanel}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto px-3 pb-4">
        {tree.map(node => (
          <TreeItem key={node.id} node={node} onSelectPage={handleSelectPage} />
        ))}
      </div>
    </div>
  );
}

// ChevronLeft icon component
function ChevronLeft({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
