import { useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutHeader, type NavigationItem } from './LayoutHeader';
import { LayoutShell } from './LayoutShell';
import { LayoutSidebar } from './LayoutSidebar';
import { LayoutFooter } from './LayoutFooter';
import type { RoomWithMeta } from '@/hooks/useRooms';

type MainLayoutProps = {
  children: ReactNode;
  navItems: NavigationItem[];
  activeRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onSearchRooms?: (term: string) => void;
  footer?: ReactNode;
  isLoadingRooms?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCloseSidebar?: () => void;
};

export function MainLayout({
  children,
  navItems,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  footer,
  isLoadingRooms = false,
  isSidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onCloseSidebar
}: MainLayoutProps) {
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);

  const resolvedSidebarOpen = controlledSidebarOpen ?? internalSidebarOpen;


  const handleSelectRoom = (roomId: string) => {
    onSelectRoom(roomId);
    if (onCloseSidebar) {
      onCloseSidebar();
    } else {
      setInternalSidebarOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
      return;
    }

    setInternalSidebarOpen((current: boolean) => !current);
  };

  const handleCloseSidebar = () => {
    if (onCloseSidebar) {
      onCloseSidebar();
      return;
    }

    setInternalSidebarOpen(false);
  };


  return (
    <LayoutShell>
      <LayoutHeader
        navItems={navItems}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={resolvedSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-chat-surface/60 bg-chat-surface/95 p-6 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:bg-chat-surface/70 ${resolvedSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <LayoutSidebar
            activeRoomId={activeRoomId}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={onCreateRoom}
            isLoading={isLoadingRooms}
          />
        </aside>

        {resolvedSidebarOpen ? (
          <button
            type="button"
            aria-label="Cerrar sidebar"
            onClick={handleCloseSidebar}
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          />
        ) : null}

        <main className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-chat-background via-chat-background to-chat-surface/60">
          <section className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6 text-slate-100">{children}</div>
          </section>
          {footer !== undefined ? footer : <LayoutFooter />}
        </main>
      </div>
    </LayoutShell>
  );
}
