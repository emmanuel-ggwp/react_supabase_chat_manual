import type { Meta, StoryObj } from '@storybook/react';
import { MessageList } from './MessageList';
import type { MessageWithMeta } from '@/hooks/useMessages';

const now = new Date();

const messages: MessageWithMeta[] = [
  {
    id: 'm1',
    room_id: 'room-1',
    user_id: 'user-1',
    content: 'Hola equipo, revisen los cambios en el repositorio.',
    message_type: 'text',
    created_at: new Date(now.getTime() - 60_000).toISOString(),
    expires_at: null,
    profile: {
      id: 'user-1',
      username: 'Ada Lovelace',
      avatar_url: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    status: 'sent'
  },
  {
    id: 'm2',
    room_id: 'room-1',
    user_id: 'current-user',
    content: '¡Gracias! Los revisaré antes de la reunión.',
    message_type: 'text',
    created_at: new Date(now.getTime() - 30_000).toISOString(),
    expires_at: null,
    profile: {
      id: 'current-user',
      username: 'Tú',
      avatar_url: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    status: 'sent'
  }
];

const meta: Meta<typeof MessageList> = {
  title: 'Chat/MessageList',
  component: MessageList,
  args: {
    messages,
    currentUserId: 'current-user',
    typingUsers: ['Ada Lovelace'],
    onRetryMessage: () => Promise.resolve()
  }
};

export default meta;

type Story = StoryObj<typeof MessageList>;

export const Default: Story = {};

export const WithTypingIndicator: Story = {
  args: {
    typingUsers: ['Ada Lovelace', 'Grace Hopper']
  }
};

export const EmptyState: Story = {
  args: {
    messages: [],
    typingUsers: []
  }
};
