import type { Meta, StoryObj } from '@storybook/react';
import { MessageItem } from './MessageItem';
import type { MessageWithMeta } from '@/hooks/useMessages';

const baseMessage: MessageWithMeta = {
  id: '1',
  room_id: 'room-1',
  user_id: 'user-1',
  content: 'Hola equipo, recuerden la reunión de las 10:00.',
  message_type: 'text',
  created_at: new Date().toISOString(),
  profile: {
    id: 'user-1',
    username: 'Ada Lovelace',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  status: 'sent'
};

const meta: Meta<typeof MessageItem> = {
  title: 'Chat/MessageItem',
  component: MessageItem,
  args: {
    message: baseMessage,
    isOwn: false,
    showAvatar: true,
    showUsername: true
  },
  parameters: {
    layout: 'centered'
  }
};

export default meta;

type Story = StoryObj<typeof MessageItem>;

export const Default: Story = {};

export const OwnMessage: Story = {
  args: {
    isOwn: true,
    message: {
      ...baseMessage,
      user_id: 'current-user',
      profile: {
        ...baseMessage.profile!,
        id: 'current-user',
        username: 'Tú'
      }
    }
  }
};

export const ErrorState: Story = {
  args: {
    isOwn: true,
    message: {
      ...baseMessage,
      id: 'error-1',
      status: 'error'
    }
  }
};
