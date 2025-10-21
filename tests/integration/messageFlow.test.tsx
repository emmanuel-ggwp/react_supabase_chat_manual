import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatContainer } from '@/components/chat/ChatContainer';
import type { RoomWithMeta } from '@/hooks/useRooms';
import type { MessageWithMeta } from '@/hooks/useMessages';

const sendMessage = jest.fn(async () => ({}));
const retryMessage = jest.fn(async () => ({}));
const loadMore = jest.fn(async () => { });
const notifyTyping = jest.fn();
const clearError = jest.fn();

const useMessagesMock = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'demo@mail.com' } })
}));

jest.mock('@/hooks/useMessages', () => ({
  useMessages: (roomId: string | null) => useMessagesMock(roomId)
}));

describe('Integración: envío y recepción de mensajes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const messages: MessageWithMeta[] = [
      {
        id: 'm1',
        room_id: 'room-1',
        user_id: 'user-2',
        content: 'Hola desde el otro lado',
        message_type: 'text',
        created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
        profile: {
          id: 'user-2',
          username: 'Grace Hopper',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        status: 'sent'
      }
    ];

    useMessagesMock.mockReturnValue({
      messages,
      isInitialLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      sendMessage,
      retryMessage,
      loadMore,
      notifyTyping,
      typingUsers: ['Grace Hopper'],
      clearError
    });
  });

  const room: RoomWithMeta = {
    id: 'room-1',
    name: 'Sala general',
    description: 'Canal de bienvenida',
    created_by: 'user-2',
    created_at: new Date().toISOString(),
    is_public: true,
    lastMessagePreview: 'Hola desde el otro lado',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    onlineUsers: 5,
    isMember: true
  };

  it('envía mensajes y muestra el historial con estados de escritura', async () => {
    const user = userEvent.setup();

    render(
      <ChatContainer
        room={room}
        isMember
        onJoinRoom={jest.fn()}
        onMarkAsRead={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hola desde el otro lado')).toBeInTheDocument();
      expect(screen.getByText(/Grace Hopper está escribiendo/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Enviar mensaje a Sala general');
    await user.type(textarea, 'Hola equipo');

    await waitFor(() => {
      expect(notifyTyping).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));

    expect(sendMessage).toHaveBeenCalledWith('Hola equipo');
  });
});
