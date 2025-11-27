import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RoomWithMeta } from '@/hooks/useRooms';
import type { ChatContextValue } from '@/components/chat/ChatProvider';
import { ChatContext } from '@/components/chat/ChatProvider';
import type { RoomMember } from '@/types/chat';
import { supabase } from '@/lib/supabase';

import App from '@/App';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'demo@mail.com' } })
}));

describe('Integración: gestión de salas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseRoom: RoomWithMeta = {
    id: 'room-1',
    name: 'Sala general',
    description: 'Canal de bienvenida',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    is_public: true,
    is_direct: false,
    lastMessagePreview: null,
    lastMessageAt: null,
    unreadCount: 0,
    onlineUsers: 12,
    isMember: false,
    displayName: 'Sala general',
    counterpartId: null
  };

  const buildChatState = (overrides: Partial<ChatContextValue> = {}) => ({
    ...getDefaultChatState(),
    ...overrides
  });

  const getDefaultChatState = (): ChatContextValue => {
    const createRoom = jest.fn(async () => ({}));
    const joinRoom = jest.fn(async () => ({}));
    const leaveRoom = jest.fn(async () => ({}));
    const markAsRead = jest.fn();
    const setActiveRoomId = jest.fn();
    const setSearchTerm = jest.fn();
    const toggleSidebar = jest.fn();
    const closeSidebar = jest.fn();
    const toggleMembersVisibility = jest.fn();
    const closeMembersPanel = jest.fn();
    const clearSearchTerm = jest.fn();
    const refresh = jest.fn();
    const openMembersPanel = jest.fn();
    const openSidebar = jest.fn();
    const startConversation = jest.fn();

    return {
      rooms: [baseRoom],
      allRooms: [baseRoom],
      activeRoomId: baseRoom.id,
      activeRoom: baseRoom,
      members: [] as RoomMember[],
      isLoading: false,
      isMembersLoading: false,
      error: null,
      searchTerm: '',
      debouncedSearchTerm: '',
      setSearchTerm,
      setActiveRoomId,
      clearSearchTerm,
      createRoom,
      joinRoom,
      leaveRoom,
      startConversation,
      markAsRead,
      isMembersVisible: false,
      toggleMembersVisibility,
      openMembersPanel,
      closeMembersPanel,
      isSidebarOpen: false,
      toggleSidebar,
      openSidebar,
      closeSidebar,
      refresh,
      isOnline: true,
      totalOnlineUsers: baseRoom.onlineUsers
    };
  };

  const renderWithChat = (value: ChatContextValue) =>
    render(
      <ChatContext.Provider value={value}>
        <App />
      </ChatContext.Provider>
    );

  it('permite unirse a una sala pública y activa la sala seleccionada', async () => {
    const state = getDefaultChatState();

    const user = userEvent.setup();
    renderWithChat(state);

    await user.click(screen.getByRole('button', { name: 'Unirme a la sala' }));

    await waitFor(() => {
      expect(state.joinRoom).toHaveBeenCalledWith('room-1');
      expect(state.setActiveRoomId).toHaveBeenCalledWith('room-1');
    });
  });

  it('muestra el error de salas cuando la carga falla', () => {
    const errorState = buildChatState({
      error: 'Fallo al cargar salas',
      isOnline: true
    });

    renderWithChat(errorState);

    expect(screen.getByText('Fallo al cargar salas')).toBeInTheDocument();
  });
});
