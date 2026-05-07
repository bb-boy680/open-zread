import { useEffect } from 'react';
import { useParams } from 'react-router';
import { useWiki } from '@/hooks/useWiki';
import { WikiContent } from './components/WikiContent';

export function WikiPage() {
  const { slug } = useParams<{ slug: string }>();
  const { wikiData, currentPage, selectPage } = useWiki();

  useEffect(() => {
    if (slug && wikiData && (!currentPage || currentPage.slug !== slug)) {
      const page = wikiData.pages.find((p) => p.slug === slug);
      if (page) {
        selectPage(page);
      }
    }
  }, [slug, wikiData, currentPage, selectPage]);

  return <WikiContent />;
}
