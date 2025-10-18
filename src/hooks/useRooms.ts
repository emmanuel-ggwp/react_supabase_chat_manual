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
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomWithMeta[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
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

  const enrichRoom = useCallback(
    async (room: RoomRow, memberships: Set<string>): Promise<RoomWithMeta> => {
      const [{ data: lastMessages, error: lastMessageError }, { count: memberCount, error: memberCountError }] =
        await Promise.all([
          supabase
            .from('messages')
            .select('content, created_at')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('room_members')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', room.id)
        ]);

      if (lastMessageError && lastMessageError.code !== 'PGRST116') {
        throw lastMessageError;
      }

      if (memberCountError && memberCountError.code !== 'PGRST116') {
        throw memberCountError;
      }

      const lastMessage = (lastMessages ?? [])[0] as Pick<MessageRow, 'content' | 'created_at'> | undefined;

      return {
        ...room,
        lastMessagePreview: lastMessage?.content ?? null,
        lastMessageAt: lastMessage?.created_at ?? null,
        unreadCount: 0,
        onlineUsers: memberCount ?? 0,
        isMember: memberships.has(room.id)
      };
    },
    []
  );

  const fetchMemberships = useCallback(async (): Promise<Set<string>> => {
    if (!user) {
      return new Set<string>();
    }

    const { data, error: membershipsError } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', user.id);

    if (membershipsError) {
      throw membershipsError;
    }

    const rows = (data ?? []) as Array<{ room_id: string }>;
    return new Set(rows.map((item) => item.room_id));
  }, [user]);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const memberships = await fetchMemberships();

      const { data, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) {
        throw roomsError;
      }

      const roomsData = (data ?? []) as RoomRow[];
      const enriched = await Promise.all(roomsData.map((room) => enrichRoom(room, memberships)));
      setRooms(enriched);

      if (!activeRoomId && enriched.length > 0) {
        setActiveRoomIdState(enriched[0].id);
      }
    } catch (fetchError) {
      console.error(fetchError);
      const message = fetchError instanceof Error ? fetchError.message : 'Error desconocido al cargar salas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeRoomId, enrichRoom, fetchMemberships]);

  const fetchMembers = useCallback(
    async (roomId: string | null) => {
      if (!roomId) {
        setMembers([]);
        return;
      }

      setIsMembersLoading(true);

      const { data, error: membersError } = await supabase
        .from('room_members')
        .select('role, profiles:profiles ( id, username, avatar_url, created_at, updated_at )')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error(membersError);
        setMembers([]);
        setIsMembersLoading(false);
        return;
      }
      const membersData = (data ?? []) as RoomMemberQueryResult[];

      const mapped: RoomMember[] = membersData
        .filter((member): member is RoomMemberQueryResult & { profiles: ProfileRow } => Boolean(member.profiles))
        .map((member) => ({
          role: member.role,
          user: member.profiles
        }));

      setMembers(mapped);
      setIsMembersLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetchMembers(activeRoomId);
  }, [activeRoomId, fetchMembers]);

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
    },
    [user?.id]
  );

  const handleRoomUpdate = useCallback((room: RoomRow) => {
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
          handleRoomInsert(payload.new as RoomRow);
        }
      },
      {
        event: 'UPDATE' as const,
        schema: 'public',
        table: 'rooms',
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          handleRoomUpdate(payload.new as RoomRow);
        }
      },
      {
        event: 'DELETE' as const,
        schema: 'public',
        table: 'rooms',
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
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

      const memberships = await fetchMemberships();
      memberships.add(room.id);

      const enriched = await enrichRoom(room, memberships);
      setRooms((prev: RoomWithMeta[]) => [enriched, ...prev]);
      setActiveRoomIdState(enriched.id);

      return { room: enriched };
    },
    [enrichRoom, fetchMemberships, user]
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
    if (activeRoomId) {
      await fetchMembers(activeRoomId);
    }
  }, [activeRoomId, fetchMembers, fetchRooms]);

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
