import { useEffect, useState } from 'react';

const WIKI_SELECTION_ROOT = '[data-chat-selection-root="true"]';

export function getSelectionTextFromRoot(
  root: Element | null,
  anchorNode: Node | null,
  text: string,
): string {
  if (!root || !anchorNode) return '';
  const anchorElement =
    anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
  if (!anchorElement) return '';
  return root.contains(anchorElement) ? text.trim() : '';
}

export function useWikiTextSelection(): string {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const root = document.querySelector(WIKI_SELECTION_ROOT);
      const text = getSelectionTextFromRoot(
        root,
        selection?.anchorNode ?? null,
        selection?.toString() ?? '',
      );
      if (text) {
        setSelectedText(text);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  return selectedText;
}
