import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useRooms, type RoomWithMeta, type UseRoomsReturn } from '@/hooks/useRooms';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useDebounce } from '@/hooks/useDebounce';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RoomMember } from '@/types/chat';

export type ChatContextValue = {
  rooms: RoomWithMeta[];
  allRooms: RoomWithMeta[];
  activeRoomId: string | null;
  activeRoom: RoomWithMeta | null;
  members: RoomMember[];
  isMembersVisible: boolean;
  toggleMembersVisibility: () => void;
  openMembersPanel: () => void;
  closeMembersPanel: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  searchTerm: string;
  debouncedSearchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearchTerm: () => void;
  setActiveRoomId: (roomId: string) => void;
  createRoom: UseRoomsReturn['createRoom'];
  joinRoom: UseRoomsReturn['joinRoom'];
  leaveRoom: UseRoomsReturn['leaveRoom'];
  refresh: UseRoomsReturn['refresh'];
  markAsRead: UseRoomsReturn['markAsRead'];
  isLoading: boolean;
  isMembersLoading: boolean;
  error: string | null;
  isOnline: boolean;
  totalOnlineUsers: number;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

type ChatProviderProps = {
  children: ReactNode;
};

export function ChatProvider({ children }: ChatProviderProps) {
  const {
    rooms,
    allRooms,
    activeRoomId,
    activeRoom,
    members,
    isLoading,
    isMembersLoading,
    error,
    searchTerm,
    setSearchTerm: baseSetSearchTerm,
    setActiveRoomId: baseSetActiveRoomId,
    createRoom,
    joinRoom,
    leaveRoom,
    refresh,
    markAsRead
  } = useRooms();

  const [storedActiveRoomId, setStoredActiveRoomId] = useLocalStorage<string | null>('chat.activeRoomId', null);
  const [isMembersVisible, setIsMembersVisible] = useLocalStorage<boolean>('chat.membersVisible', false);
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage<boolean>('chat.sidebarOpen', false);
  const [storedSearchTerm, setStoredSearchTerm, clearStoredSearchTerm] = useLocalStorage<string>('chat.searchTerm', '');

  const debouncedSearchTerm = useDebounce(storedSearchTerm, 250);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (storedActiveRoomId && storedActiveRoomId !== activeRoomId) {
      baseSetActiveRoomId(storedActiveRoomId);
    }
  }, [activeRoomId, baseSetActiveRoomId, storedActiveRoomId]);

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      baseSetSearchTerm(debouncedSearchTerm);
    }
  }, [baseSetSearchTerm, debouncedSearchTerm, searchTerm]);

  useEffect(() => {
    if (!activeRoomId && storedActiveRoomId !== null) {
      setStoredActiveRoomId(null);
      return;
    }

    if (activeRoomId && storedActiveRoomId !== activeRoomId) {
      setStoredActiveRoomId(activeRoomId);
    }
  }, [activeRoomId, setStoredActiveRoomId, storedActiveRoomId]);

  useEffect(() => {
    if (searchTerm !== storedSearchTerm) {
      setStoredSearchTerm(searchTerm);
    }
  }, [searchTerm, setStoredSearchTerm, storedSearchTerm]);

  useEffect(() => {
    if (members.length === 0 && isMembersVisible) {
      setIsMembersVisible(false);
    }
  }, [isMembersVisible, members, setIsMembersVisible]);

  const handleSetActiveRoomId = useCallback(
    (roomId: string) => {
      baseSetActiveRoomId(roomId);
      setStoredActiveRoomId(roomId);
    },
    [baseSetActiveRoomId, setStoredActiveRoomId]
  );

  const handleSetSearchTerm = useCallback(
    (term: string) => {
      setStoredSearchTerm(term);
      baseSetSearchTerm(term);
    },
    [baseSetSearchTerm, setStoredSearchTerm]
  );

  const clearSearchTerm = useCallback(() => {
    clearStoredSearchTerm();
    baseSetSearchTerm('');
  }, [baseSetSearchTerm, clearStoredSearchTerm]);

  const toggleMembersVisibility = useCallback(() => {
    setIsMembersVisible((current: boolean) => !current);
  }, [setIsMembersVisible]);

  const openMembersPanel = useCallback(() => {
    setIsMembersVisible(true);
  }, [setIsMembersVisible]);

  const closeMembersPanel = useCallback(() => {
    setIsMembersVisible(false);
  }, [setIsMembersVisible]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((current: boolean) => !current);
  }, [setIsSidebarOpen]);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, [setIsSidebarOpen]);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, [setIsSidebarOpen]);

  const totalOnlineUsers = useMemo(() => allRooms.reduce((total, room) => total + room.onlineUsers, 0), [allRooms]);

  const value = useMemo<ChatContextValue>(
    () => ({
      rooms,
      allRooms,
      activeRoomId,
      activeRoom,
      members,
      isMembersVisible,
      toggleMembersVisibility,
      openMembersPanel,
      closeMembersPanel,
      isSidebarOpen,
      toggleSidebar,
      openSidebar,
      closeSidebar,
      searchTerm: storedSearchTerm,
      debouncedSearchTerm,
      setSearchTerm: handleSetSearchTerm,
      clearSearchTerm,
      setActiveRoomId: handleSetActiveRoomId,
      createRoom,
      joinRoom,
      leaveRoom,
      refresh,
      markAsRead,
      isLoading,
      isMembersLoading,
      error,
      isOnline,
      totalOnlineUsers
    }),
    [
      activeRoom,
      activeRoomId,
      allRooms,
      clearSearchTerm,
      closeMembersPanel,
      closeSidebar,
      createRoom,
      debouncedSearchTerm,
      error,
      handleSetActiveRoomId,
      handleSetSearchTerm,
      isLoading,
      isMembersLoading,
      isMembersVisible,
      isOnline,
      isSidebarOpen,
      joinRoom,
      leaveRoom,
      markAsRead,
      members,
      openMembersPanel,
      openSidebar,
      refresh,
      rooms,
      storedSearchTerm,
      toggleMembersVisibility,
      toggleSidebar,
      totalOnlineUsers
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
}
