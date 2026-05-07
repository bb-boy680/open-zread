import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useWiki } from '@/hooks/useWiki';

export function HomePage() {
  const { wikiData } = useWiki();
  const navigate = useNavigate();

  useEffect(() => {
    if (wikiData && wikiData.pages.length > 0) {
      navigate(`/${wikiData.pages[0].slug}`, { replace: true });
    }
  }, [wikiData, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500">
      加载中...
    </div>
  );
}
