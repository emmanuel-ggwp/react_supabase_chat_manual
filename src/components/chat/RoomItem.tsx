import { memo } from 'react';
import type { RoomWithMeta } from '@/hooks/useRooms';
import { formatRelativeTime, truncate } from '@/utils';

type RoomItemProps = {
  room: RoomWithMeta;
  isActive?: boolean;
  onSelect: (roomId: string) => void;
};

export const RoomItem = memo(function RoomItem({ room, isActive = false, onSelect }: RoomItemProps) {
  const displayName = room.displayName ?? room.name;
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={`w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 ${
        isActive
          ? 'border-chat-primary/60 bg-chat-primary/15 text-white'
          : 'border-transparent bg-chat-surface/90 text-chat-muted hover:border-chat-primary/40 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chat-secondary/40 text-sm font-semibold text-chat-secondary">
          {initials || displayName.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <span className="text-[11px] uppercase tracking-wide text-chat-muted/80">
              {room.lastMessageAt ? formatRelativeTime(room.lastMessageAt) : 'Sin actividad'}
            </span>
          </div>
          {room.description ? (
            <p className="mt-1 text-xs text-chat-muted/90">{truncate(room.description, 64)}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-chat-muted/70">
        <span>{room.onlineUsers} conectados</span>
        {room.unreadCount > 0 ? (
          <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-chat-primary px-2 text-xs font-semibold text-white">
            {room.unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
});
