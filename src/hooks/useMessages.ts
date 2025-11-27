import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { useAuth } from './useAuth';
import { useRealtime } from './useRealtime';

const PAGE_SIZE = 40;
const TYPING_DEBOUNCE_MS = 800;
const TYPING_VISIBILITY_MS = 3000;

type MessageRow = Database['public']['Tables']['messages']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type MessageRecord = MessageRow & { profiles?: ProfileRow | null };

type TypingPayload = {
  roomId: string;
  userId: string;
  username: string | null;
  isTyping: boolean;
};

export type MessageWithMeta = MessageRow & {
  profile: ProfileRow | null;
  status: 'sending' | 'sent' | 'error';
};

type UseMessagesReturn = {
  messages: MessageWithMeta[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  sendMessage: (content: string, expiresIn?: number) => Promise<{ error?: string }>;
  retryMessage: (messageId: string) => Promise<{ error?: string }>;
  loadMore: () => Promise<void>;
  notifyTyping: () => void;
  typingUsers: string[];
  clearError: () => void;
};

function hydrateMessage(message: MessageRecord): MessageWithMeta {
  return {
    id: message.id,
    room_id: message.room_id,
    user_id: message.user_id,
    content: message.content,
    message_type: message.message_type,
    created_at: message.created_at,
    expires_at: message.expires_at,
    profile: message.profiles ?? null,
    status: 'sent'
  };
}

/**
 * Centraliza la lógica de lectura y escritura de mensajes para una sala.
 * Gestiona paginación, estados optimistas, suscripciones en tiempo real y la señalización de usuarios escribiendo.
 */
export function useMessages(roomId: string | null): UseMessagesReturn {
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<MessageWithMeta[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsersState, setTypingUsersState] = useState<string[]>([]);

  const oldestTimestampRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEventRef = useRef<number>(0);
  const typingUserTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((currentMessages) => {
        const hasExpiringMessages = currentMessages.some(msg => msg.expires_at);
        if (!hasExpiringMessages) {
          return currentMessages;
        }

        const now = new Date().toISOString();
        const validMessages = currentMessages.filter(
          (msg) => !msg.expires_at || msg.expires_at > now
        );
        
        if (validMessages.length !== currentMessages.length) {
          return validMessages;
        }
        return currentMessages;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const resetState = useCallback(() => {
    setMessages([]);
    setHasMore(false);
    setError(null);
    setTypingUsersState([]);
    oldestTimestampRef.current = null;
  }, []);

  const fetchMessages = useCallback(
    async (params?: { before?: string; limit?: number }) => {
      if (!roomId) {
        return [] as MessageRecord[];
      }

      const limit = params?.limit ?? PAGE_SIZE;
      const query = supabase
        .from('messages')
        .select('*, profiles:profiles ( id, username, avatar_url )')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (params?.before) {
        query.lt('created_at', params.before);
      }

      // Filtrar expirados también en el cliente por si acaso, aunque RLS lo hace
      const now = new Date().toISOString();
      query.or(`expires_at.is.null,expires_at.gt.${now}`);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      return (data ?? []) as MessageRecord[];
    },
    [roomId]
  );

  useEffect(() => {
    resetState();

    if (!roomId) {
      return;
    }

    let isMounted = true;
    setIsInitialLoading(true);

    fetchMessages()
  .then((fetched: MessageRecord[]) => {
        if (!isMounted) {
          return;
        }

        const hydrated = fetched.map(hydrateMessage).reverse();
        setMessages(hydrated);
        oldestTimestampRef.current = hydrated[0]?.created_at ?? null;
        setHasMore(fetched.length === PAGE_SIZE);
      })
  .catch((loadError: unknown) => {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : 'Error desconocido al cargar mensajes.';
        setError(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchMessages, resetState, roomId]);

  const handleRealtimeInsert = useCallback(
    async (message: MessageRow) => {
      if (!roomId || message.room_id !== roomId) {
        return;
      }

      const { data, error: singleError } = await supabase
        .from('messages')
        .select('*, profiles:profiles ( id, username, avatar_url )')
        .eq('id', message.id)
        .single();

      if (singleError || !data) {
        return;
      }

      const hydrated = hydrateMessage(data as MessageRecord);

      setMessages((prev: MessageWithMeta[]) => {
        if (prev.some((item: MessageWithMeta) => item.id === hydrated.id)) {
          return prev;
        }

        const next = [...prev, hydrated];
        next.sort((a: MessageWithMeta, b: MessageWithMeta) => a.created_at.localeCompare(b.created_at));
        return next;
      });
    },
    [roomId]
  );

  const handleTypingBroadcast = useCallback(
    (payload: TypingPayload) => {
      if (!roomId || payload.roomId !== roomId) {
        return;
      }

      if (payload.userId === user?.id) {
        return;
      }

      setTypingUsersState((current: string[]) => {
        const withoutUser = current.filter((username: string) => username !== payload.username);

        if (!payload.isTyping) {
          return withoutUser;
        }

        return [...withoutUser, payload.username ?? 'Usuario'];
      });

      const timeouts = typingUserTimeoutsRef.current;
      const timeoutKey = payload.userId;

      if (timeouts[timeoutKey]) {
        clearTimeout(timeouts[timeoutKey]);
      }

      if (payload.isTyping) {
        timeouts[timeoutKey] = setTimeout(() => {
          setTypingUsersState((current: string[]) => current.filter((username: string) => username !== payload.username));
          delete typingUserTimeoutsRef.current[timeoutKey];
        }, TYPING_VISIBILITY_MS);
      } else {
        delete typingUserTimeoutsRef.current[timeoutKey];
      }
    },
    [roomId, user?.id]
  );

  const realtimeBindings = useMemo(() => {
    if (!roomId) {
      return [];
    }

    return [
      {
        type: 'postgres_changes' as const,
        event: 'INSERT' as const,
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
        callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const message = payload.new as MessageRow | undefined;
          if (!message) {
            return;
          }
          handleRealtimeInsert(message);
        }
      },
      {
        type: 'broadcast' as const,
        event: 'typing',
        callback: (payload: unknown) => {
          handleTypingBroadcast(payload as TypingPayload);
        }
      }
    ];
  }, [handleRealtimeInsert, handleTypingBroadcast, roomId]);

  const channelConfig = useMemo(
    () => ({
      config: {
        broadcast: { self: false }
      }
    }),
    []
  );

  const channel = useRealtime({
    channel: roomId ? `room-messages-${roomId}` : 'room-messages',
    config: channelConfig,
    bindings: realtimeBindings,
    enabled: Boolean(roomId),
    onError: (realtimeError: unknown) => {
      console.error('Error en la suscripción de mensajes', realtimeError);
    }
  });

  useEffect(() => {
    if (!roomId) {
      typingUserTimeoutsRef.current = {};
      return;
    }

    return () => {
      (Object.values(typingUserTimeoutsRef.current) as Array<ReturnType<typeof setTimeout>>).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      typingUserTimeoutsRef.current = {};
    };
  }, [roomId]);

  const loadMore = useCallback(async () => {
    if (!roomId || !oldestTimestampRef.current || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const fetched = await fetchMessages({ before: oldestTimestampRef.current });
      const hydrated = fetched.map(hydrateMessage).reverse();

  setMessages((prev: MessageWithMeta[]) => [...hydrated, ...prev]);
      oldestTimestampRef.current = hydrated[0]?.created_at ?? oldestTimestampRef.current;
      setHasMore(fetched.length === PAGE_SIZE);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Error al cargar mensajes anteriores.';
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchMessages, isLoadingMore, roomId]);

  const sendMessage = useCallback(
    async (content: string, expiresIn?: number) => {
      if (!roomId) {
        return { error: 'No hay una sala seleccionada.' };
      }

      if (!user) {
        return { error: 'Debes iniciar sesión para enviar mensajes.' };
      }

      const trimmed = content.trim();

      if (!trimmed) {
        return { error: 'El mensaje no puede estar vacío.' };
      }

      const now = new Date();
      const expiresAt = expiresIn ? new Date(now.getTime() + expiresIn * 1000).toISOString() : null;

      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: MessageWithMeta = {
        id: optimisticId,
        room_id: roomId,
        user_id: user.id,
        content: trimmed,
        message_type: 'text',
        created_at: now.toISOString(),
        expires_at: expiresAt,
        profile: profile ?? null,
        status: 'sending'
      };

  setMessages((prev: MessageWithMeta[]) => [...prev, optimistic]);

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({ 
          room_id: roomId, 
          user_id: user.id, 
          content: trimmed, 
          message_type: 'text',
          expires_at: expiresAt
        })
        .select('*, profiles:profiles ( id, username, avatar_url )')
        .single();

      if (insertError || !data) {
        setMessages((prev: MessageWithMeta[]) =>
          prev.map((message: MessageWithMeta) =>
            message.id === optimisticId
              ? {
                  ...message,
                  status: 'error'
                }
              : message
          )
        );

        const message = insertError instanceof Error ? insertError.message : 'No se pudo enviar el mensaje.';
        return { error: message };
      }

      const hydrated = hydrateMessage(data as MessageRecord);

      setMessages((prev: MessageWithMeta[]) =>
        prev
          .map((message: MessageWithMeta) => (message.id === optimisticId ? hydrated : message))
          .sort((a: MessageWithMeta, b: MessageWithMeta) => a.created_at.localeCompare(b.created_at))
      );

      return {};
    },
    [profile, roomId, user]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      let messageContent: string | null = null;

      setMessages((prev: MessageWithMeta[]) => {
        const target = prev.find((item: MessageWithMeta) => item.id === messageId && item.status === 'error');
        messageContent = target?.content ?? null;
        return prev.filter((item: MessageWithMeta) => item.id !== messageId);
      });

      if (!messageContent) {
        return { error: 'No se pudo reenviar el mensaje.' };
      }

      return sendMessage(messageContent);
    },
    [sendMessage]
  );

  const notifyTyping = useCallback(() => {
    if (!roomId || !user || !channel) {
      return;
    }

    const now = Date.now();

    if (now - lastTypingEventRef.current > TYPING_DEBOUNCE_MS) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          roomId,
          userId: user.id,
          username: profile?.username ?? null,
          isTyping: true
        } satisfies TypingPayload
      });
      lastTypingEventRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          roomId,
          userId: user.id,
          username: profile?.username ?? null,
          isTyping: false
        } satisfies TypingPayload
      });
    }, TYPING_VISIBILITY_MS);
  }, [channel, profile?.username, roomId, user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      (Object.values(typingUserTimeoutsRef.current) as Array<ReturnType<typeof setTimeout>>).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      typingUserTimeoutsRef.current = {};

      if (!user || !roomId || !channel) {
        return;
      }

      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          roomId,
          userId: user.id,
          username: profile?.username ?? null,
          isTyping: false
        } satisfies TypingPayload
      });
    };
  }, [channel, profile?.username, roomId, user]);

  const typingUsers = useMemo(() => typingUsersState, [typingUsersState]);

  return {
    messages,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    error,
    sendMessage,
    retryMessage,
    loadMore,
    notifyTyping,
    typingUsers,
    clearError
  };
}
