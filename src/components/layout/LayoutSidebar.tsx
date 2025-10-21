import { RoomList } from '../chat/RoomList';

type LayoutSidebarProps = {
  activeRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  isLoading?: boolean;
};

export function LayoutSidebar({
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  isLoading = false
}: LayoutSidebarProps) {
  return (
    <RoomList
      activeRoomId={activeRoomId}
      onSelectRoom={onSelectRoom}
      onCreateRoom={onCreateRoom}
      isLoading={isLoading}
    />
  );
}
