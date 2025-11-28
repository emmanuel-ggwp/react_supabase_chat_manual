import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreateRoomModal, RoomHeader, ChatContainer, useChat } from '@/components/chat';
import type { RoomMember } from '@/types/chat';

const navItems = [
  { label: 'Chats', href: '#', isActive: true },
  { label: 'Equipos', href: '#teams' },
  { label: 'Configuración', href: '#settings' }
];

function App() {
  //TODO: refactorizar para usar eliminar las propiedades innecesarias
  const {
    activeRoom,
    members,
    isLoading,
    isMembersLoading,
    error,
    setSearchTerm,
    setActiveRoomId,
    createRoom,
    joinRoom,
    leaveRoom,
    markAsRead,
    isMembersVisible,
    toggleMembersVisibility,
    closeMembersPanel,
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    isOnline
  } = useChat();

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);
  const [leaveRoomError, setLeaveRoomError] = useState<string | null>(null);
  const [joinRoomError, setJoinRoomError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    if (activeRoom?.isMember) {
      setJoinRoomError(null);
    }
  }, [activeRoom?.isMember]);

  const handleCreateRoom = async (values: { name: string; description?: string | null; isPublic?: boolean }) => {
    setCreateRoomError(null);
    setIsCreatingRoom(true);

    try {
      const { error: createError } = await createRoom(values);
      if (createError) {
        setCreateRoomError(createError);
        return;
      }

      setIsCreateRoomOpen(false);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    setLeaveRoomError(null);
    const { error: leaveError } = await leaveRoom(roomId);
    if (leaveError) {
      setLeaveRoomError(leaveError);
    }
  };

  const handleJoinRoom = async (roomId: string): Promise<{ error?: string }> => {
    setJoinRoomError(null);
    const result = await joinRoom(roomId);
    if (result.error) {
      setJoinRoomError(result.error);
      return { error: result.error };
    }

    setActiveRoomId(roomId);
    return {};
  };

  return (
    <>
      <MainLayout
        navItems={navItems}
        onSelectRoom={(roomId) => {
          setActiveRoomId(roomId);
          closeMembersPanel();
          setLeaveRoomError(null);
          setJoinRoomError(null);
        }}
        onCreateRoom={() => {
          setIsCreateRoomOpen(true);
          setCreateRoomError(null);
        }}
        onSearchRooms={setSearchTerm}
        isLoadingRooms={isLoading}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
      >
        {!isOnline ? (
          <div className="rounded-lg border border-chat-warning/40 bg-chat-warning/20 px-4 py-2 text-sm text-chat-warning">
            Estás sin conexión. Los mensajes se reenviarán automáticamente cuando la conexión se restablezca.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-chat-danger/40 bg-chat-danger/15 px-4 py-3 text-sm text-chat-danger">
            {error}
          </div>
        ) : null}

        {activeRoom ? (
          <div className="flex h-full flex-col space-y-6">
            <RoomHeader
              members={members}
              onLeaveRoom={activeRoom.isMember ? handleLeaveRoom : undefined}
              onOpenSettings={() => console.info('Abrir configuración de sala', activeRoom.id)}
              onToggleMembers={
                members.length > 0 ? toggleMembersVisibility : undefined
              }
            />

            {isMembersVisible && members.length > 0 ? (
              <section className="rounded-2xl border border-chat-surface/60 bg-chat-surface/80 p-4 text-sm text-chat-muted">
                <header className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-chat-muted/80">
                  <span>Miembros</span>
                  {isMembersLoading ? <span className="text-[11px] lowercase">Cargando...</span> : null}
                </header>
                <ul className="grid gap-3 md:grid-cols-2">
                  {members.map((member: RoomMember) => (
                    <li key={member.user.id} className="rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{member.user.username}</p>
                      <p className="text-xs uppercase tracking-wide text-chat-muted/80">{member.role}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {leaveRoomError ? (
              <div className="rounded-lg border border-chat-danger/40 bg-chat-danger/15 px-4 py-2 text-sm text-chat-danger">
                {leaveRoomError}
              </div>
            ) : null}

            <ChatContainer
              room={activeRoom}
              isMember={activeRoom.isMember}
              onJoinRoom={handleJoinRoom}
              onMarkAsRead={markAsRead}
              joinError={joinRoomError}
            />
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-chat-surface/60 bg-chat-surface/70 p-6 text-center text-sm text-chat-muted shadow-lg">
            {isLoading ? 'Cargando salas...' : 'Selecciona una sala para comenzar a chatear.'}
          </section>
        )}
      </MainLayout>

      <CreateRoomModal
        open={isCreateRoomOpen}
        onClose={() => {
          setIsCreateRoomOpen(false);
          setCreateRoomError(null);
        }}
        onSubmit={handleCreateRoom}
        isSubmitting={isCreatingRoom}
        error={createRoomError}
      />
    </>
  );
}

export default App;
