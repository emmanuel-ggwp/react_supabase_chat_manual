import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RoomList } from './RoomList';
import type { RoomWithMeta } from '@/hooks/useRooms';

const rooms: RoomWithMeta[] = [
  {
    id: 'room-1',
    name: 'General',
    description: 'Canal principal de announcements',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    is_public: true,
    lastMessagePreview: 'Próxima demo el viernes',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 3,
    onlineUsers: 12,
    isMember: true
  },
  {
    id: 'room-2',
    name: 'Soporte',
    description: 'Atención en vivo',
    created_by: 'user-2',
    created_at: new Date().toISOString(),
    is_public: true,
    lastMessagePreview: 'Ticket #42 resuelto',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    onlineUsers: 4,
    isMember: false
  }
];

const meta: Meta<typeof RoomList> = {
  title: 'Chat/RoomList',
  component: RoomList,
  args: {
    rooms,
    activeRoomId: 'room-1',
    searchTerm: '',
    onlineUsers: 16,
    onSearchTermChange: fn(),
    onSelectRoom: fn(),
    onCreateRoom: fn()
  }
};

export default meta;

type Story = StoryObj<typeof RoomList>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true
  }
};

export const Empty: Story = {
  args: {
    rooms: []
  }
};
