import { useRef, useEffect } from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { useWiki } from '@/hooks/useWiki';
import { useTocContext } from '@/context/TocContext';
import type { TocItem } from '@/hooks/useTableOfContents';

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const { currentPage } = useWiki();
  const { activeId } = useTocContext();
  const listRef = useRef<HTMLUListElement>(null);

  // activeId 变化时滚动目录列表让高亮项居中
  useEffect(() => {
    if (!activeId || !listRef.current) return;

    const activeItem = listRef.current.querySelector(
      `[data-active="true"]`
    ) as HTMLLIElement | null;
    if (!activeItem) return;

    const list = listRef.current;
    const itemTop = activeItem.offsetTop;
    const itemHeight = activeItem.offsetHeight;
    const listHeight = list.clientHeight;

    list.scrollTo({
      top: itemTop - listHeight / 2 + itemHeight / 2,
      behavior: 'smooth',
    });
  }, [activeId]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <HoverCard.Root openDelay={100} closeDelay={200}>
      <HoverCard.Trigger asChild>
        <div className="toc-glyph-container" aria-label="目录指示器">
          <ul className="toc-glyph-list" aria-hidden="true">
            {items.map((item) => (
              <li
                key={item.id}
                className={`toc-glyph-item ${activeId === item.id ? 'toc-glyph-item-active' : ''}`}
                data-level={item.level}
              />
            ))}
          </ul>
        </div>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          className="toc-card"
          side="left"
          align="start"
          sideOffset={12}
          collisionPadding={16}
        >
          <div className="toc-card-header">
            <span className="toc-card-title">{currentPage?.title || '概述'}</span>
          </div>

          <ul ref={listRef} className="toc-list" aria-label="目录导航">
            {items.map((item) => (
              <li
                key={item.id}
                className="toc-item"
                data-active={activeId === item.id ? 'true' : 'false'}
                data-level={item.level}
              >
                <button
                  onClick={() => handleClick(item.id)}
                  className="toc-button"
                  type="button"
                >
                  <span className="truncate block">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
