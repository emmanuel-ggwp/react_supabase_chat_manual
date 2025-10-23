import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RoomItem } from './RoomItem';
import type { RoomWithMeta } from '@/hooks/useRooms';

const room: RoomWithMeta = {
  id: 'room-1',
  name: 'Ventas LATAM',
  description: 'Seguimiento de oportunidades y objetivos semanales',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  is_public: true,
  is_direct: false,
  lastMessagePreview: 'Actualizamos el forecast de octubre',
  lastMessageAt: new Date().toISOString(),
  unreadCount: 5,
  onlineUsers: 7,
  isMember: true,
  displayName: 'Ventas LATAM',
  counterpartId: null
};

const meta: Meta<typeof RoomItem> = {
  title: 'Chat/RoomItem',
  component: RoomItem,
  args: {
    room,
    isActive: false,
    onSelect: fn()
  }
};

export default meta;

type Story = StoryObj<typeof RoomItem>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    isActive: true
  }
};
