import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
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
  startConversation: UseRoomsReturn['startConversation'];
  refresh: UseRoomsReturn['refresh'];
  markAsRead: UseRoomsReturn['markAsRead'];
  isLoading: boolean;
  isMembersLoading: boolean;
  error: string | null;
  isOnline: boolean;
  totalOnlineUsers: number;
};

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);

type ChatProviderProps = {
  children: ReactNode;
};

/**
 * Provee el contexto colaborativo del chat: salas, miembros y helpers para sincronizar estado UI con Supabase.
 */
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
    searchTerm: roomsSearchTerm,
    setSearchTerm: baseSetSearchTerm,
    setActiveRoomId: baseSetActiveRoomId,
    createRoom,
    joinRoom,
    leaveRoom,
    startConversation,
    refresh,
    markAsRead
  } = useRooms();

  const [storedActiveRoomId, setStoredActiveRoomId] = useLocalStorage<string | null>('chat.activeRoomId', null);
  const [isMembersVisible, setIsMembersVisible] = useLocalStorage<boolean>('chat.membersVisible', false);
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorage<boolean>('chat.sidebarOpen', false);
  const [searchTerm, setSearchTerm, clearStoredSearchTerm] = useLocalStorage<string>('chat.searchTerm', '');

  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const isOnline = useOnlineStatus();
  const hasRestoredActiveRoomRef = useRef(false);

  useEffect(() => {
    if (hasRestoredActiveRoomRef.current) {
      return;
    }

    if (!storedActiveRoomId) {
      hasRestoredActiveRoomRef.current = true;
      return;
    }

    if (activeRoomId === storedActiveRoomId) {
      hasRestoredActiveRoomRef.current = true;
      return;
    }

    if (!activeRoomId) {
      baseSetActiveRoomId(storedActiveRoomId);
      hasRestoredActiveRoomRef.current = true;
    }
  }, [activeRoomId, baseSetActiveRoomId, storedActiveRoomId]);

  useEffect(() => {
    if (debouncedSearchTerm !== roomsSearchTerm) {
      baseSetSearchTerm(debouncedSearchTerm);
    }
  }, [baseSetSearchTerm, debouncedSearchTerm, roomsSearchTerm]);

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

  const clearSearchTerm = useCallback(() => {
    clearStoredSearchTerm();
  }, [clearStoredSearchTerm]);

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
      searchTerm,
      debouncedSearchTerm,
      setSearchTerm,
      clearSearchTerm,
      setActiveRoomId: handleSetActiveRoomId,
      createRoom,
      joinRoom,
      leaveRoom,
      startConversation,
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
      searchTerm,
      setSearchTerm,
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
