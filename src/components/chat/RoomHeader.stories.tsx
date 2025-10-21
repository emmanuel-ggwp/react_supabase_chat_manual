import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RoomHeader } from './RoomHeader';
import type { RoomWithMeta } from '@/hooks/useRooms';
import type { RoomMember } from '@/types/chat';


const members: RoomMember[] = [
  {
    role: 'owner',
    user: {
      id: 'user-1',
      username: 'Ada Lovelace',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    role: 'member',
    user: {
      id: 'user-2',
      username: 'Grace Hopper',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
];

const onLeaveRoom = fn<(roomId: string) => void>();
const onOpenSettings = fn<(roomId: string) => void>();
const onToggleMembers = fn<() => void>();

const meta: Meta<typeof RoomHeader> = {
  title: 'Chat/RoomHeader',
  component: RoomHeader,
  args: {
    members,
    onLeaveRoom,
    onOpenSettings,
    onToggleMembers
  }
};

export default meta;

type Story = StoryObj<typeof RoomHeader>;

export const Default: Story = {};

export const WithoutMembers: Story = {
  args: {
    members: [],
    onToggleMembers: undefined
  }
};
