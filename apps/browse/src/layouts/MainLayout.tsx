// apps/browse/src/layouts/MainLayout.tsx
import { useState, type CSSProperties } from 'react';
import { Outlet } from 'react-router';
import { ChatWidget } from '@/features/chat/ChatWidget';
import { CHAT_PANEL_DEFAULT_WIDTH } from '@/features/chat/chatState';
import { WikiSidebar } from '@/components/WikiSidebar';

export function MainLayout() {
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(CHAT_PANEL_DEFAULT_WIDTH);
  const chatPanelStyle = {
    '--chat-panel-width': `${chatPanelWidth}px`,
  } as CSSProperties;

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
