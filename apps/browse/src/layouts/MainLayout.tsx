// apps/browse/src/layouts/MainLayout.tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ChatWidget } from '@/features/chat/ChatWidget';
import { CHAT_PANEL_DEFAULT_WIDTH } from '@/features/chat/chatState';
import { WikiSidebar } from '@/components/WikiSidebar';
import { resetScrollElementToTop } from '@/utils/scroll';

export function MainLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(CHAT_PANEL_DEFAULT_WIDTH);
  const chatPanelStyle = {
    '--chat-panel-width': `${chatPanelWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    resetScrollElementToTop(mainRef.current);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-white overflow-hidden" style={chatPanelStyle}>
      <WikiSidebar />
      
      <main
        className={`flex-1 min-w-0 overflow-y-auto scroll-smooth chat-main ${
          chatCollapsed ? '' : 'chat-main-with-panel'
        }`}
      >
        <Outlet />
      </main>

      <ChatWidget
        panelWidth={chatPanelWidth}
        onCollapsedChange={setChatCollapsed}
        onPanelWidthChange={setChatPanelWidth}
      />
    </div>
  );
}
