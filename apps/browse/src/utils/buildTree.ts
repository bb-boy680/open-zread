// apps/browse/src/utils/buildTree.ts
import type { WikiPage, TreeNode } from '@/types/wiki';

export function buildTree(pages: WikiPage[]): TreeNode[] {
  const sections = new Map<string, TreeNode>();
  const groups = new Map<string, TreeNode>();

  for (const page of pages) {
    const sectionKey = page.section;

    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, {
        type: 'section',
        id: `section-${sectionKey}`,
        title: sectionKey,
        children: []
      });
    }

    const section = sections.get(sectionKey);
    if (!section || !section.children) {
      continue;
    }

    if (page.group) {
      const groupKey = `${sectionKey}/${page.group}`;

      if (!groups.has(groupKey)) {
        const groupNode: TreeNode = {
          type: 'group',
          id: `group-${groupKey}`,
          title: page.group,
          children: []
        };
        groups.set(groupKey, groupNode);
        section.children.push(groupNode);
      }

      const group = groups.get(groupKey);
      if (!group || !group.children) {
        continue;
      }

      group.children.push({
        type: 'page',
        id: `page-${page.slug}`,
        title: page.title,
        pageData: page
      });
      continue;
    }

    section.children.push({
      type: 'page',
      id: `page-${page.slug}`,
      title: page.title,
      pageData: page
    });
  }

  return Array.from(sections.values());
}
