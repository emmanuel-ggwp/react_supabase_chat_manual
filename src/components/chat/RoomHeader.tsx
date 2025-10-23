import { Users, Settings, LogOut } from 'lucide-react';
import type { RoomWithMeta } from '@/hooks/useRooms';
import type { Database } from '@/types/database';
import { formatRelativeTime } from '@/utils';
import { useChat } from './ChatProvider';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type RoomHeaderProps = {
  members?: Array<{ user: ProfileRow; role: string }>;
  onLeaveRoom?: (roomId: string) => void;
  onOpenSettings?: (roomId: string) => void;
  onToggleMembers?: () => void;
};

export function RoomHeader({ members = [], onLeaveRoom, onOpenSettings, onToggleMembers }: RoomHeaderProps) {
  const room: RoomWithMeta = useChat().activeRoom!;
  const displayName = room.displayName ?? room.name;
  
  const handleLeave = () => {
    onLeaveRoom?.(room.id);
  };

  const handleSettings = () => {
    onOpenSettings?.(room.id);
  };

  return (
    <header className="rounded-2xl border border-chat-surface/60 bg-chat-surface/80 px-5 py-4 text-sm text-chat-muted shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chat-primary/20 text-lg font-semibold text-chat-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-chat-muted">Sala activa</p>
              <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
            </div>
          </div>
          {room.description ? <p className="mt-3 max-w-2xl text-xs text-chat-muted">{room.description}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[8px] uppercase tracking-wide text-chat-muted/80">
            <span>{room.onlineUsers} conectados</span>
            <span>
              Última actividad:{' '}
              <strong className="text-chat-muted/60">
                {room.lastMessageAt ? formatRelativeTime(room.lastMessageAt) : 'Sin mensajes recientes'}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 && onToggleMembers ? (
            <button
              type="button"
              onClick={onToggleMembers}
              className="inline-flex items-center gap-2 rounded-full border border-chat-surface/60 px-4 py-2 text-xs font-semibold text-chat-muted transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
            >
              <Users size={16} />
              {members.length} miembros
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleSettings}
            className="inline-flex items-center gap-2 rounded-full border border-chat-surface/60 px-4 py-2 text-xs font-semibold text-chat-muted transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
          >
            <Settings size={16} />
            Configurar
          </button>

          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-2 rounded-full bg-chat-danger/20 px-4 py-2 text-xs font-semibold text-chat-danger transition hover:bg-chat-danger/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-danger/60"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </div>

      {members.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {members.slice(0, 6).map((member) => {
            const displayName = member.user.username ?? 'Usuario';
            const initials = displayName
              .split(' ')
              .map((part) => part.charAt(0).toUpperCase())
              .slice(0, 2)
              .join('');

            return (
              <span
                key={member.user.id}
                className="inline-flex items-center gap-2 rounded-full border border-chat-surface/60 bg-chat-surface/90 px-3 py-1 text-xs text-chat-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-chat-secondary/30 text-[11px] font-semibold text-chat-secondary">
                  {initials || displayName.charAt(0).toUpperCase()}
                </span>
                <span className="text-white">{displayName}</span>
              </span>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
