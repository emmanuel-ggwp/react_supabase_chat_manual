import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecretMessageBubble } from '@/components/chat/SecretMessageBubble';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

describe('SecretMessageBubble', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it('renders "Mensaje oculto enviado" for sender', () => {
    render(<SecretMessageBubble messageId="msg-1" isSender={true} isRead={false} />);
    expect(screen.getByText('Mensaje oculto enviado')).toBeInTheDocument();
  });

  it('renders "Toca para ver" for receiver when unread', () => {
    render(<SecretMessageBubble messageId="msg-1" isSender={false} isRead={false} />);
    expect(screen.getByText('Toca para ver (Vista única)')).toBeInTheDocument();
  });

  it('renders "Ya visto" when read', async () => {
    // Mock empty viewers response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [] })
      })
    });

    render(<SecretMessageBubble messageId="msg-1" isSender={false} isRead={true} />);
    
    await waitFor(() => {
        expect(screen.getByText('Ya visto')).toBeInTheDocument();
    });
  });

  it('reveals content on click', async () => {
    const secretContent = 'This is a secret';
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: secretContent, error: null });

    render(<SecretMessageBubble messageId="msg-1" isSender={false} isRead={false} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(secretContent)).toBeInTheDocument();
    });
    expect(supabase.rpc).toHaveBeenCalledWith('read_secret_message', { p_message_id: 'msg-1' });
  });

  it('shows error when reveal fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Error' } });

    render(<SecretMessageBubble messageId="msg-1" isSender={false} isRead={false} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Error al desencriptar el mensaje.')).toBeInTheDocument();
    });
  });
});
