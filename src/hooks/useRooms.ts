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

const DIRECT_ROOM_PREFIX = 'direct:' as const;

type DirectRoomMeta = {
  displayName: string;
  counterpartId: string | null;
};

function resolveDirectParticipants(roomName: string): [string, string] | null {
  if (!roomName.startsWith(DIRECT_ROOM_PREFIX)) {
    return null;
  }

  const ids = roomName.slice(DIRECT_ROOM_PREFIX.length).split(':');
  if (ids.length !== 2 || ids.some((id) => id.trim().length === 0)) {
    return null;
  }

  return [ids[0], ids[1]];
}

function computeRoomDisplay(room: RoomRow, members: RoomMember[], currentUserId?: string | null): DirectRoomMeta {
  if (!room.is_direct) {
    return {
      displayName: room.name,
      counterpartId: null
    };
  }

  console.log('Computing display for direct room:', room, members, currentUserId);
  const counterpart = members.find((member) => member.user.id !== currentUserId);
  if (counterpart) {
    return {
      displayName: counterpart.user.username ?? 'Conversación',
      counterpartId: counterpart.user.id
    };
  }

  const participants = resolveDirectParticipants(room.name);
  const counterpartId = participants?.find((id) => id !== currentUserId) ?? null;

  return {
    displayName: 'Conversación',
    counterpartId
  };
}

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
  displayName: string;
  counterpartId: string | null;
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
  startConversation: (profile: ProfileRow) => Promise<{ room?: RoomWithMeta; error?: string }>;
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
      [room.displayName, room.name, room.description ?? '']
        .filter((value) => value)
        .some((value) => value.toLowerCase().includes(term))
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
        const { displayName, counterpartId } = computeRoomDisplay(room, roomMembers, user?.id);

        return {
          ...room,
          lastMessagePreview: lastMessage?.content ?? null,
          lastMessageAt: lastMessage?.created_at ?? null,
          unreadCount: 0,
          onlineUsers: roomMembers.length,
          isMember: membershipSet.has(room.id) || room.created_by === user?.id,
          displayName,
          counterpartId
        } satisfies RoomWithMeta;
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
      const applyInsert = (resolvedMembers: RoomMember[]) => {
        const { displayName, counterpartId } = computeRoomDisplay(room, resolvedMembers, user?.id);
        const enriched: RoomWithMeta = {
          ...room,
          lastMessagePreview: null,
          lastMessageAt: null,
          unreadCount: 0,
          onlineUsers: resolvedMembers.length,
          isMember:
            resolvedMembers.some((member) => member.user.id === user?.id) || room.created_by === user?.id,
          displayName,
          counterpartId
        };

        setMembersByRoom((prev) => {
          const existingMembers = prev[room.id];
          if (existingMembers && existingMembers.length >= resolvedMembers.length) {
            return prev;
          }

          return {
            ...prev,
            [room.id]: resolvedMembers
          };
        });

        setRooms((prev: RoomWithMeta[]) => {
          if (prev.some((item) => item.id === room.id)) {
            return prev;
          }

          return [enriched, ...prev];
        });
      };

      if (room.is_direct) {
        void (async () => {
          const { data: memberRows, error: membersError } = await supabase
            .from('room_members')
            .select('role, profiles:profiles ( id, username, avatar_url, created_at, updated_at )')
            .eq('room_id', room.id);

          if (membersError) {
            console.error('No se pudieron cargar los miembros de la conversación directa', membersError);
            applyInsert([]);
            return;
          }

          const directMembers = (memberRows ?? [])
            .map((member) => {
              if (!member.profiles) {
                return null;
              }

              return {
                role: member.role,
                user: member.profiles
              } satisfies RoomMember;
            })
            .filter((entry): entry is RoomMember => Boolean(entry));

          applyInsert(directMembers);
        })();

        return;
      }

      applyInsert([]);
    },
    [user?.id]
  );

  const handleRoomUpdate = useCallback(
    (room: RoomRow) => {
      console.log('Room updated:', room);
      setRooms((prev: RoomWithMeta[]) =>
        prev.map((item: RoomWithMeta) => {
          if (item.id !== room.id) {
            return item;
          }

          const membersForRoom = membersByRoom[room.id] ?? [];
          const { displayName, counterpartId } = computeRoomDisplay(room, membersForRoom, user?.id);

          return {
            ...item,
            ...room,
            displayName,
            counterpartId
          } satisfies RoomWithMeta;
        })
      );
    },
    [membersByRoom, user?.id]
  );

  const handleRoomDelete = useCallback(
    (roomId: string) => {
      setRooms((prev: RoomWithMeta[]) => prev.filter((room) => room.id !== roomId));
      setMembers([]);
      setMembersByRoom((prev) => {
        if (!prev[roomId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[roomId];
        return next;
      });
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
        isMember: true,
        displayName: room.name,
        counterpartId: null
      };

      setRooms((prev: RoomWithMeta[]) => [enriched, ...prev]);
      setMembersByRoom((prev) => ({ ...prev, [room.id]: [] }));
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

  const startConversation = useCallback(
    async (target: ProfileRow) => {
      if (!user) {
        return { error: 'Debes iniciar sesión para iniciar una conversación.' };
      }

      if (!target?.id) {
        return { error: 'Selecciona un usuario válido.' };
      }

      if (target.id === user.id) {
        return { error: 'No puedes iniciar una conversación contigo mismo.' };
      }

      const sortedParticipantIds = [user.id, target.id].sort((a, b) => a.localeCompare(b));
      const deterministicName = `${DIRECT_ROOM_PREFIX}${sortedParticipantIds[0]}:${sortedParticipantIds[1]}`;

      const { data: existingRooms, error: lookupError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_direct', true)
        .eq('name', deterministicName)
        .limit(1);

      if (lookupError) {
        return { error: lookupError.message };
      }

      let roomRecord = (existingRooms?.[0] as RoomRow | undefined) ?? null;

      if (!roomRecord) {
        const { data: createdRoom, error: roomError } = await supabase
          .from('rooms')
          .insert({
            name: deterministicName,
            description: null,
            is_public: false,
            is_direct: true,
            created_by: user.id
          })
          .select('*')
          .single<RoomRow>();

        if (roomError || !createdRoom) {
          return { error: roomError?.message ?? 'No se pudo crear la conversación.' };
        }

        roomRecord = createdRoom;
      }

      const membershipPayload: Array<{ room_id: string; user_id: string; role: RoomMemberRow['role'] }> = [
        {
          room_id: roomRecord.id,
          user_id: user.id,
          role: roomRecord.created_by === user.id ? 'owner' : 'member'
        },
        {
          room_id: roomRecord.id,
          user_id: target.id,
          role: roomRecord.created_by === target.id ? 'owner' : 'member'
        }
      ];

      for (const membership of membershipPayload) {
        const { error: membershipError } = await supabase.from('room_members').insert(membership);

        if (membershipError && membershipError.code !== '23505') {
          return { error: membershipError.message };
        }
      }

      const { data: memberRows, error: membersError } = await supabase
        .from('room_members')
        .select('role, profiles:profiles ( id, username, avatar_url, created_at, updated_at )')
        .eq('room_id', roomRecord.id);

      if (membersError) {
        return { error: membersError.message };
      }

      const memberMap = new Map<string, RoomMember>();

      for (const row of memberRows ?? []) {
        if (!row.profiles) {
          continue;
        }

        memberMap.set(row.profiles.id, {
          role: row.role,
          user: row.profiles
        });
      }

      if (profile && !memberMap.has(profile.id)) {
        memberMap.set(profile.id, {
          role: roomRecord.created_by === profile.id ? 'owner' : 'member',
          user: profile
        });
      }

      if (!memberMap.has(target.id)) {
        memberMap.set(target.id, {
          role: roomRecord.created_by === target.id ? 'owner' : 'member',
          user: target
        });
      }

      const resolvedMembers = Array.from(memberMap.values());
      const { displayName, counterpartId } = computeRoomDisplay(roomRecord, resolvedMembers, user.id);

      setMembersByRoom((prev) => ({ ...prev, [roomRecord!.id]: resolvedMembers }));

      const existingRoom = rooms.find((item) => item.id === roomRecord!.id);
      const enriched: RoomWithMeta = {
        ...roomRecord,
        lastMessagePreview: existingRoom?.lastMessagePreview ?? null,
        lastMessageAt: existingRoom?.lastMessageAt ?? null,
        unreadCount: existingRoom?.unreadCount ?? 0,
        onlineUsers: resolvedMembers.length,
        isMember: true,
        displayName,
        counterpartId
      };

      setRooms((prev) => {
        const index = prev.findIndex((item) => item.id === enriched.id);

        if (index === -1) {
          return [enriched, ...prev];
        }

        const next = [...prev];
        const current = next[index];

        next[index] = {
          ...current,
          ...enriched,
          lastMessagePreview: current.lastMessagePreview,
          lastMessageAt: current.lastMessageAt,
          unreadCount: current.unreadCount
        } satisfies RoomWithMeta;

        return next;
      });

      setActiveRoomIdState(roomRecord.id);
      setMembers(resolvedMembers);
      setIsMembersLoading(false);

      return { room: enriched };
    },
    [profile, rooms, user]
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
    startConversation,
    refresh,
    markAsRead
  };
}
