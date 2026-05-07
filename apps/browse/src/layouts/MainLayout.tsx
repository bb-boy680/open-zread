// apps/browse/src/layouts/MainLayout.tsx
import { Outlet } from 'react-router';
import { WikiSidebar } from '@/components/WikiSidebar';

export function MainLayout() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <WikiSidebar />

      <main className="flex-1 min-w-0 overflow-y-auto scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
}
