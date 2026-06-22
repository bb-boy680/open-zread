export type ScrollableElement = {
  scrollTop: number;
  scrollLeft: number;
  scrollTo?: (options: ScrollToOptions) => void;
};

export function resetScrollElementToTop(element: ScrollableElement | null): void {
  if (!element) {
    return;
  }

  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }

  element.scrollTop = 0;
  element.scrollLeft = 0;
}
