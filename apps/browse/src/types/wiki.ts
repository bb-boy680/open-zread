// apps/browse/src/types/wiki.ts

export type WikiLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface WikiPage {
  slug: string;
  title: string;
  file: string;
  section: string;
  group?: string;
  level: WikiLevel;
  associatedFiles?: string[];
}

export interface WikiOutput {
  id: string;
  generated_at: string;
  language: string;
  pages: WikiPage[];
}

export interface TreeNode {
  type: 'section' | 'group' | 'page';
  id: string;
  title: string;
  children?: TreeNode[];
  pageData?: WikiPage;
}

export interface CodeReference {
  fileName: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface WikiState {
  wikiData: WikiOutput | null;
  currentPage: WikiPage | null;
  currentContent: string;
  references: CodeReference[];
  activeReference: CodeReference | null;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  expandedNodes: Set<string>;
  sourceModalOpen: boolean;
  sourceModalRef: CodeReference | null;
}
