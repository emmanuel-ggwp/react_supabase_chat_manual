import { RoomList } from '../chat/RoomList';
import type { RoomWithMeta } from '@/hooks/useRooms';

type LayoutSidebarProps = {
  rooms: RoomWithMeta[];
  activeRoomId?: string;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onlineUsers?: number;
  isLoading?: boolean;
};

export function LayoutSidebar({
  rooms,
  activeRoomId,
  searchTerm,
  onSearchTermChange,
  onSelectRoom,
  onCreateRoom,
  onlineUsers = 0,
  isLoading = false
}: LayoutSidebarProps) {
  return (
    <RoomList
      rooms={rooms}
      activeRoomId={activeRoomId}
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      onSelectRoom={onSelectRoom}
      onCreateRoom={onCreateRoom}
      onlineUsers={onlineUsers}
      isLoading={isLoading}
    />
  );
}
