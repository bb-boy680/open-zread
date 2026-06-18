// apps/browse/src/layouts/MainLayout.tsx
import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { WikiSidebar } from '@/components/WikiSidebar';
import { resetScrollElementToTop } from '@/utils/scroll';

export function MainLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    resetScrollElementToTop(mainRef.current);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <WikiSidebar />

      <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
}
