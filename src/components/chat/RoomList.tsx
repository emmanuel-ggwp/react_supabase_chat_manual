import type { ChangeEvent } from 'react';
import { RoomItem } from './RoomItem';
import { useChat } from './ChatProvider';

type RoomListProps = {
  activeRoomId?: string | null;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  isLoading?: boolean;
};

export function RoomList({
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  isLoading = false
}: RoomListProps) {

  const {
    rooms,
    searchTerm,
    setSearchTerm,
    totalOnlineUsers: onlineUsers
  } = useChat();

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-chat-muted">Salas</p>
          <h2 className="text-xl font-semibold text-white">Conversaciones</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-chat-muted">
          <span className="inline-flex h-2 w-2 rounded-full bg-chat-success" aria-hidden />
          <span>{onlineUsers} usuarios en línea</span>
        </div>
        <div>
          <label className="sr-only" htmlFor="room-search-input">
            Buscar salas
          </label>
          <div className="relative">
            <input
              id="room-search-input"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar salas"
              className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/60 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
            />
            {
              !searchTerm?.length ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-chat-muted">⌕</span>
              ) : null
            }
            
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {isLoading ? (
          <p className="rounded-lg border border-chat-surface/60 bg-chat-surface/80 px-4 py-3 text-sm text-chat-muted">
            Cargando salas...
          </p>
        ) : rooms.length === 0 ? (
          <p className="rounded-lg border border-dashed border-chat-surface/60 bg-chat-surface/70 px-4 py-3 text-sm text-chat-muted">
            No se encontraron salas.
          </p>
        ) : (
          rooms.map((room) => (
            <RoomItem key={room.id} room={room} isActive={room.id === activeRoomId} onSelect={onSelectRoom} />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onCreateRoom}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-dashed border-chat-primary/60 px-4 py-2 text-sm font-semibold text-chat-primary transition hover:border-chat-primary hover:bg-chat-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
      >
        Crear nueva sala
      </button>
    </div>
  );
}
