import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LayoutHeader, type NavigationItem } from './LayoutHeader';
import { LayoutShell } from './LayoutShell';
import { LayoutSidebar } from './LayoutSidebar';
import { LayoutFooter } from './LayoutFooter';
import type { RoomWithMeta } from '@/hooks/useRooms';

type MainLayoutProps = {
  children: ReactNode;
  navItems: NavigationItem[];
  rooms: RoomWithMeta[];
  activeRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onlineUsers?: number;
  onSearchRooms?: (term: string) => void;
  footer?: ReactNode;
  isLoadingRooms?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCloseSidebar?: () => void;
  searchTerm?: string;
};

export function MainLayout({
  children,
  navItems,
  rooms,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onlineUsers = 0,
  onSearchRooms,
  footer,
  isLoadingRooms = false,
  isSidebarOpen: controlledSidebarOpen,
  onToggleSidebar,
  onCloseSidebar,
  searchTerm: externalSearchTerm = ''
}: MainLayoutProps) {
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(externalSearchTerm);

  const resolvedSidebarOpen = controlledSidebarOpen ?? internalSidebarOpen;

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    onSearchRooms?.(term);
  };

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

  useEffect(() => {
    setSearchTerm(externalSearchTerm);
  }, [externalSearchTerm]);

  return (
    <LayoutShell>
      <LayoutHeader
        navItems={navItems}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={resolvedSidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-chat-surface/60 bg-chat-surface/95 p-6 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:bg-chat-surface/70 ${
            resolvedSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <LayoutSidebar
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={onCreateRoom}
            searchTerm={searchTerm}
            onSearchTermChange={handleSearchChange}
            onlineUsers={onlineUsers}
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
