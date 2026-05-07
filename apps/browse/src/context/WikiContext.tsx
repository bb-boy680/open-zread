// apps/browse/src/context/WikiContext.tsx
import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { wikiApi } from '@/utils/api';
import type { WikiOutput, WikiPage, CodeReference, WikiState } from '@/types/wiki';
import { buildTree } from '@/utils/buildTree';
import { parseReferences } from '@/utils/parseReferences';

interface WikiContextValue extends WikiState {
  tree: ReturnType<typeof buildTree>;
  loadWikiData: () => Promise<void>;
  selectPage: (page: WikiPage) => Promise<void>;
  toggleNode: (nodeId: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  selectReference: (ref: CodeReference | null) => void;
  loadSourceCode: (filePath: string, lineStart?: number, lineEnd?: number) => Promise<string | null>;
  openSourceModal: (ref: CodeReference) => void;
  closeSourceModal: () => void;
}

const WikiContext = createContext<WikiContextValue | null>(null);

export { WikiContext };

// Helper to collect all group node IDs
function collectGroupIds(nodes: ReturnType<typeof buildTree>): Set<string> {
  const groupIds = new Set<string>();
  const traverse = (nodeList: typeof nodes) => {
    for (const node of nodeList) {
      if (node.type === 'group') {
        groupIds.add(node.id);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return groupIds;
}

export function WikiProvider({ children }: { children: React.ReactNode }) {
  const [wikiData, setWikiData] = useState<WikiOutput | null>(null);
  const [currentPage, setCurrentPage] = useState<WikiPage | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [references, setReferences] = useState<CodeReference[]>([]);
  const [activeReference, setActiveReference] = useState<CodeReference | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const hasInitializedExpanded = useRef(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalRef, setSourceModalRef] = useState<CodeReference | null>(null);

  const tree = useMemo(() => (wikiData ? buildTree(wikiData.pages) : []), [wikiData]);

  // Load source code from API
  const loadSourceCode = useCallback(async (filePath: string, lineStart?: number, lineEnd?: number) => {
    try {
      const result = await wikiApi.getSource(filePath, lineStart, lineEnd);
      return result.code;
    } catch (error) {
      console.error('Error loading source code:', error);
      return null;
    }
  }, []);

  const selectPage = useCallback(async (page: WikiPage) => {
    setCurrentPage(page);

    try {
      // Load wiki content from API
      const data = await wikiApi.getContent(page.slug);
      setCurrentContent(data.content);

      // Parse references from markdown content
      const refs = parseReferences(data.content);
      setReferences(refs);
      setActiveReference(refs[0] || null);
    } catch (error) {
      console.error('Error loading page content:', error);
      setCurrentContent('# Error\n\nFailed to load page content.');
      setReferences([]);
      setActiveReference(null);
    }
  }, []);

  const loadWikiData = useCallback(async () => {
    try {
      // Load wiki catalog from API
      const data = await wikiApi.getCatalog();
      setWikiData(data);
      setInitialLoadComplete(true);
    } catch (error) {
      console.error('Error loading wiki data:', error);
    }
  }, []);

  // Select first page after data is loaded
  useEffect(() => {
    if (initialLoadComplete && wikiData && wikiData.pages.length > 0 && !currentPage) {
      const timer = setTimeout(() => {
        selectPage(wikiData.pages[0]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialLoadComplete, wikiData, currentPage, selectPage]);

  // Initialize expanded nodes when tree is first built
  useEffect(() => {
    if (tree.length > 0 && !hasInitializedExpanded.current) {
      hasInitializedExpanded.current = true;
      const groupIds = collectGroupIds(tree);
      const timer = setTimeout(() => {
        setExpandedNodes(groupIds);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tree]);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelCollapsed((prev) => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelCollapsed((prev) => !prev);
  }, []);

  const selectReference = useCallback((ref: CodeReference | null) => {
    setActiveReference(ref);
  }, []);

  const openSourceModal = useCallback((ref: CodeReference) => {
    setSourceModalRef(ref);
    setSourceModalOpen(true);
  }, []);

  const closeSourceModal = useCallback(() => {
    setSourceModalOpen(false);
    setSourceModalRef(null);
  }, []);

  const value: WikiContextValue = {
    wikiData,
    currentPage,
    currentContent,
    references,
    activeReference,
    leftPanelCollapsed,
    rightPanelCollapsed,
    expandedNodes,
    tree,
    loadWikiData,
    selectPage,
    toggleNode,
    toggleLeftPanel,
    toggleRightPanel,
    selectReference,
    loadSourceCode,
    sourceModalOpen,
    sourceModalRef,
    openSourceModal,
    closeSourceModal
  };

  return (
    <WikiContext.Provider value={value}>
      {children}
    </WikiContext.Provider>
  );
}
