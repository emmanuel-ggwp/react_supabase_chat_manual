import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RoomList } from './RoomList';
import { ChatContext, type ChatContextValue } from './ChatProvider';
import type { RoomWithMeta } from '@/hooks/useRooms';

const baseRoom: RoomWithMeta = {
  id: 'room-1',
  name: 'Sala general',
  description: 'Canal de bienvenida',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  is_public: true,
  is_direct: false,
  lastMessagePreview: '¡Bienvenido al chat!',
  lastMessageAt: new Date().toISOString(),
  unreadCount: 0,
  onlineUsers: 8,
  isMember: true,
  displayName: 'Sala general',
  counterpartId: null
};

const createChatContextValue = (overrides: Partial<ChatContextValue> = {}): ChatContextValue => ({
  rooms: [baseRoom],
  allRooms: [baseRoom],
  activeRoomId: baseRoom.id,
  activeRoom: baseRoom,
  members: [],
  isMembersVisible: false,
  toggleMembersVisibility: fn(),
  openMembersPanel: fn(),
  closeMembersPanel: fn(),
  isSidebarOpen: false,
  toggleSidebar: fn(),
  openSidebar: fn(),
  closeSidebar: fn(),
  searchTerm: '',
  debouncedSearchTerm: '',
  setSearchTerm: fn(),
  clearSearchTerm: fn(),
  setActiveRoomId: fn(),
  createRoom: fn(async () => ({})),
  joinRoom: fn(async () => ({})),
  leaveRoom: fn(async () => ({})),
  startConversation: fn(async () => ({})),
  refresh: fn(async () => {}),
  markAsRead: fn(),
  isLoading: false,
  isMembersLoading: false,
  error: null,
  isOnline: true,
  totalOnlineUsers: baseRoom.onlineUsers,
  ...overrides
});

type RoomListStoryMeta = Meta<typeof RoomList> & {
  parameters: {
    chat?: Partial<ChatContextValue>;
  };
};

const meta: RoomListStoryMeta = {
  title: 'Chat/RoomList',
  component: RoomList,
  args: {
    activeRoomId: baseRoom.id,
    onSelectRoom: fn(),
    onCreateRoom: fn()
  },
  decorators: [
    (Story, context) => (
      <ChatContext.Provider value={createChatContextValue(context.parameters.chat)}>
        <Story />
      </ChatContext.Provider>
    )
  ],
  parameters: {
    chat: {}
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
  parameters: {
    chat: {
      rooms: [],
      allRooms: [],
      activeRoomId: null,
      activeRoom: null,
      totalOnlineUsers: 0
    }
  }
};
