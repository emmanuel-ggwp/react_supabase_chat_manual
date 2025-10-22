import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { RoomMember } from '@/types/chat';
import { useAuth } from './useAuth';
import { useSupabaseSubscription } from './useSupabaseSubscription';
import type { PostgresSubscription } from './useSupabaseSubscription';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomInsert = Database['public']['Tables']['rooms']['Insert'];
type RoomMemberRow = Database['public']['Tables']['room_members']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type RoomMemberQueryResult = Pick<RoomMemberRow, 'role'> & { profiles: ProfileRow | null };

type CreateRoomPayload = {
  name: string;
  description?: string | null;
  isPublic?: boolean;
};

export type RoomWithMeta = RoomRow & {
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  onlineUsers: number;
  isMember: boolean;
};

export type UseRoomsReturn = {
  rooms: RoomWithMeta[];
  allRooms: RoomWithMeta[];
  activeRoomId: string | null;
  activeRoom: RoomWithMeta | null;
  members: RoomMember[];
  isLoading: boolean;
  isMembersLoading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setActiveRoomId: (roomId: string) => void;
  createRoom: (payload: CreateRoomPayload) => Promise<{ room?: RoomWithMeta; error?: string }>;
  joinRoom: (roomId: string) => Promise<{ error?: string }>;
  leaveRoom: (roomId: string) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
  markAsRead: (roomId: string) => void;
};

export function useRooms(): UseRoomsReturn {
  const { user, status: authStatus, profile } = useAuth();
  const [rooms, setRooms] = useState<RoomWithMeta[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [membersByRoom, setMembersByRoom] = useState<Record<string, RoomMember[]>>({});
  const [activeRoomId, setActiveRoomIdState] = useState<string | null>(null);
  const [searchTerm, setSearchTermState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRoom = useMemo(
    () => rooms.find((room: RoomWithMeta) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId]
  );

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return rooms;
    }

    return rooms.filter((room: RoomWithMeta) =>
      [room.name, room.description ?? ''].some((value) => value.toLowerCase().includes(term))
    );
  }, [rooms, searchTerm]);

  const setActiveRoomId = useCallback(
    (roomId: string) => {
      setActiveRoomIdState(roomId);
    },
    []
  );

  const markAsRead = useCallback((roomId: string) => {
    setRooms((prev: RoomWithMeta[]) =>
      prev.map((room: RoomWithMeta) =>
        room.id === roomId
          ? {
              ...room,
              unreadCount: 0
            }
          : room
      )
    );
  }, []);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) {
        throw roomsError;
      }

      const roomsData = (data ?? []) as RoomRow[];
      const roomIds = roomsData.map((room) => room.id);

      const lastMessageMap = new Map<string, { content: string; created_at: string }>();
      const membershipSet = new Set<string>();
      const nextMembersByRoom: Record<string, RoomMember[]> = {};

      if (roomIds.length > 0) {
        const [{ data: memberRows, error: membersError }, { data: messageRows, error: messagesError }] = await Promise.all([
          supabase
            .from('room_members')
            .select(
              'room_id, user_id, role, profiles:profiles ( id, username, avatar_url, created_at, updated_at )'
            )
            .in('room_id', roomIds),
          supabase
            .from('messages')
            .select('room_id, content, created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: false })
        ]);

        if (membersError) {
          throw membersError;
        }

        if (messagesError) {
          throw messagesError;
        }

        for (const row of (memberRows ?? []) as Array<{
          room_id: string;
          user_id: string;
          role: RoomMemberRow['role'];
          profiles: ProfileRow | null;
        }>) {
          if (!nextMembersByRoom[row.room_id]) {
            nextMembersByRoom[row.room_id] = [];
          }

          if (row.profiles) {
            nextMembersByRoom[row.room_id].push({
              role: row.role,
              user: row.profiles
            });
          }

          if (row.user_id === user?.id) {
            membershipSet.add(row.room_id);
          }
        }

        for (const message of (messageRows ?? []) as Array<Pick<MessageRow, 'room_id' | 'content' | 'created_at'>>) {
          if (!lastMessageMap.has(message.room_id)) {
            lastMessageMap.set(message.room_id, { content: message.content, created_at: message.created_at });
          }
        }
      }

      for (const id of roomIds) {
        if (!nextMembersByRoom[id]) {
          nextMembersByRoom[id] = [];
        }
      }

      const enriched = roomsData.map((room) => {
        const lastMessage = lastMessageMap.get(room.id);
        const roomMembers = nextMembersByRoom[room.id] ?? [];

        return {
          ...room,
          lastMessagePreview: lastMessage?.content ?? null,
          lastMessageAt: lastMessage?.created_at ?? null,
          unreadCount: 0,
          onlineUsers: roomMembers.length,
          isMember: membershipSet.has(room.id)
        };
      });

      setRooms(enriched);

  const nextActiveRoomId = activeRoomId ?? (enriched[0]?.id ?? null);
      setMembersByRoom(nextMembersByRoom);
      setMembers(nextActiveRoomId ? nextMembersByRoom[nextActiveRoomId] ?? [] : []);

      if (enriched.length > 0) {
        setActiveRoomIdState((current: string | null) => current ?? enriched[0].id);
      }
    } catch (fetchError) {
      console.error(fetchError);
      const message = fetchError instanceof Error ? fetchError.message : 'Error desconocido al cargar salas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const isAuthReady = authStatus !== 'loading';

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }
    fetchRooms();
  }, [fetchRooms, isAuthReady]);

  useEffect(() => {
    if (!activeRoomId) {
      setMembers([]);
      setIsMembersLoading(false);
      return;
    }

    setMembers(membersByRoom[activeRoomId] ?? []);
    setIsMembersLoading(false);
  }, [activeRoomId, membersByRoom]);

  useEffect(() => {
    if (activeRoomId) {
      markAsRead(activeRoomId);
    }
  }, [activeRoomId, markAsRead]);

  const handleRoomInsert = useCallback(
    (room: RoomRow) => {
      setRooms((prev: RoomWithMeta[]) => {
        if (prev.some((item) => item.id === room.id)) {
          return prev;
        }

        return [
          {
            ...room,
            lastMessagePreview: null,
            lastMessageAt: null,
            unreadCount: 0,
            onlineUsers: 0,
            isMember: room.created_by === user?.id
          },
          ...prev
        ];
      });
      setMembersByRoom((prev) => {
        if (prev[room.id]) {
          return prev;
        }
        return { ...prev, [room.id]: [] };
      });
    },
    [user?.id]
  );

  const handleRoomUpdate = useCallback((room: RoomRow) => {

    console.log('Room updated:', room);
    setRooms((prev: RoomWithMeta[]) =>
      prev.map((item: RoomWithMeta) =>
        item.id === room.id
          ? {
              ...item,
              ...room
            }
          : item
      )
    );
  }, []);

  const handleRoomDelete = useCallback(
    (roomId: string) => {
      setRooms((prev: RoomWithMeta[]) => prev.filter((room) => room.id !== roomId));
      setMembers([]);
      setActiveRoomIdState((current: string | null) => (current === roomId ? null : current));
    },
    []
  );

  const handleMessageInsert = useCallback(
    (message: MessageRow) => {
      setRooms((prev: RoomWithMeta[]) =>
        prev.map((room: RoomWithMeta) => {
          if (room.id !== message.room_id) {
            return room;
          }

          const unreadIncrement = room.id === activeRoomId ? 0 : room.unreadCount + 1;

          return {
            ...room,
            lastMessagePreview: message.content,
            lastMessageAt: message.created_at,
            unreadCount: unreadIncrement
          };
        })
      );

      if (message.room_id === activeRoomId) {
        markAsRead(message.room_id);
      }
    },
    [activeRoomId, markAsRead]
  );
  const postgresSubscriptions = useMemo<PostgresSubscription<Record<string, unknown>>[]>(
    () => [
      {
        event: 'INSERT' as const,
        schema: 'public',
        table: 'rooms',
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('Room inserted:', payload.new);
          handleRoomInsert(payload.new as RoomRow);
        }
      },
      {
        event: 'UPDATE' as const,
        schema: 'public',
        table: 'rooms',
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('Room updated (subscription):', payload.new);
          handleRoomUpdate(payload.new as RoomRow);
        }
      },
      {
        event: 'DELETE' as const,
        schema: 'public',
        table: 'rooms',
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('Room deleted:', payload.old);
          handleRoomDelete((payload.old as RoomRow).id);
        }
      },
      {
        event: 'INSERT' as const,
        schema: 'public',
        table: 'messages',
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          handleMessageInsert(payload.new as MessageRow);
        }
      }
    ],
    [handleMessageInsert, handleRoomDelete, handleRoomInsert, handleRoomUpdate]
  );
  

  useSupabaseSubscription({
    channel: 'rooms-realtime',
    postgres: postgresSubscriptions,
    onError: (subscriptionError: unknown) => {
      console.error('Realtime subscription error', subscriptionError);
    }
  });

  const createRoom = useCallback(
    async ({ name, description, isPublic = true }: CreateRoomPayload) => {
      if (!user) {
        return { error: 'Debes iniciar sesión para crear una sala.' };
      }

      const payload: RoomInsert = {
        name,
        description: description ?? null,
        is_public: isPublic,
        created_by: user.id
      };

      const { data: room, error: insertError } = await supabase
        .from('rooms')
        .insert(payload)
        .select('*')
        .single<RoomRow>();

      if (insertError) {
        return { error: insertError.message };
      }

      if (!room) {
        return { error: 'No se pudo crear la sala.' };
      }

      const enriched: RoomWithMeta = {
        ...room,
        lastMessagePreview: null,
        lastMessageAt: null,
        unreadCount: 0,
        onlineUsers: 1,
        isMember: true
      };

      setRooms((prev: RoomWithMeta[]) => [enriched, ...prev]);
      console.log('Created room:', enriched);
      setActiveRoomIdState(enriched.id);

      return { room: enriched };
    },
    [user]
  );

  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!user) {
        return { error: 'Debes iniciar sesión para unirte a una sala.' };
      }

      const { error: joinError } = await supabase
        .from('room_members')
        .insert({ room_id: roomId, user_id: user.id, role: 'member' });

      if (joinError && joinError.code !== '23505') {
        return { error: joinError.message };
      }

      setRooms((prev: RoomWithMeta[]) =>
        prev.map((room: RoomWithMeta) =>
          room.id === roomId
            ? {
                ...room,
                isMember: true,
                onlineUsers: Math.max(1, room.onlineUsers + (joinError ? 0 : 1))
              }
            : room
        )
      );

      return {};
    },
    [user]
  );

  const leaveRoom = useCallback(
    async (roomId: string) => {
      if (!user) {
        return { error: 'Debes iniciar sesión para abandonar una sala.' };
      }

      const { error: leaveError } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (leaveError) {
        return { error: leaveError.message };
      }

      setRooms((prev: RoomWithMeta[]) =>
        prev.map((room: RoomWithMeta) =>
          room.id === roomId
            ? {
                ...room,
                isMember: false,
                onlineUsers: Math.max(0, room.onlineUsers - 1)
              }
            : room
        )
      );

      if (activeRoomId === roomId) {
        setActiveRoomIdState(null);
      }

      return {};
    },
    [activeRoomId, user]
  );

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  const refresh = useCallback(async () => {
    await fetchRooms();
  }, [fetchRooms]);

  return {
    rooms: filteredRooms,
    allRooms: rooms,
    activeRoomId,
    activeRoom,
    members,
    isLoading,
    isMembersLoading,
    error,
    searchTerm,
    setSearchTerm,
    setActiveRoomId,
    createRoom,
    joinRoom,
    leaveRoom,
    refresh,
    markAsRead
  };
}
