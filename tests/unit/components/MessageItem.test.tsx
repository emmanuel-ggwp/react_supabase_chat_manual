import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MessageItem } from '@/components/chat/MessageItem';
import type { MessageWithMeta } from '@/hooks/useMessages';

describe('MessageItem', () => {
  const baseMessage: MessageWithMeta = {
    id: '1',
    room_id: 'room-1',
    user_id: 'user-1',
    content: 'Hola equipo',
    message_type: 'text',
    created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    profile: {
      id: 'user-1',
      username: 'Ada Lovelace',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    status: 'sent'
  };

  it('alinea los mensajes propios a la derecha y muestra el estado', () => {
    const { container } = render(
      <MessageItem message={baseMessage} isOwn showAvatar showUsername onRetry={jest.fn()} />
    );

    expect(container.firstChild).toHaveClass('items-end');
    expect(container.firstChild).toHaveClass('ml-auto');
    expect(screen.getByText('Hola equipo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it('muestra el botón de reintento cuando el envío falla', () => {
    const errored: MessageWithMeta = { ...baseMessage, id: '2', status: 'error' };
    const handleRetry = jest.fn();

    render(<MessageItem message={errored} isOwn showAvatar showUsername onRetry={handleRetry} />);

    const retryButton = screen.getByRole('button', { name: /reintentar/i });
    retryButton.click();

    expect(handleRetry).toHaveBeenCalledWith(errored);
  });

  it('renderiza las iniciales y nombre cuando es de otro usuario', () => {
    const otherMessage: MessageWithMeta = {
      ...baseMessage,
      id: '3',
      user_id: 'user-2',
      profile: {
        id: 'user-2',
        username: 'Grace Hopper',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    render(
      <MessageItem message={otherMessage} isOwn={false} showAvatar showUsername onRetry={jest.fn()} />
    );

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('GH')).toBeInTheDocument();
  });
});
