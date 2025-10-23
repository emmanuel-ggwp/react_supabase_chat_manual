import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import type { MessageWithMeta } from '@/hooks/useMessages';
import type { RoomWithMeta } from '@/hooks/useRooms';
import { useAuth } from '@/hooks/useAuth';

type ChatContainerProps = {
  room: RoomWithMeta;
  isMember: boolean;
  onJoinRoom?: (roomId: string) => Promise<{ error?: string }>;
  onMarkAsRead?: (roomId: string) => void;
  joinError?: string | null;
};

/**
 * Orquesta la vista principal del chat combinando historial, banner de estado y formulario de envío.
 */
export function ChatContainer({ room, isMember, onJoinRoom, onMarkAsRead, joinError }: ChatContainerProps) {
  const { user } = useAuth();
  const {
    messages,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    error: messageError,
    sendMessage,
    retryMessage,
    loadMore,
    notifyTyping,
    typingUsers,
    clearError
  } = useMessages(isMember ? room.id : null);

  const [sendError, setSendError] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    setSendError(null);
  }, [room.id]);

  useEffect(() => {
    setJoinState((current: { loading: boolean; error: string | null }) => ({ ...current, error: joinError ?? null }));
  }, [joinError]);

  const handleScroll = (event: { currentTarget: HTMLDivElement }) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - (target.scrollTop + target.clientHeight);
    const isNearBottom = distanceToBottom < 120;

    setAutoScroll(isNearBottom);

    if (isNearBottom && isMember) {
      onMarkAsRead?.(room.id);
    }
  };

  useEffect(() => {
  if (!autoScroll) return;

  requestAnimationFrame(() => {
    const scrollContainer = scrollContainerRef.current;
    //TODO: Verificar si esto no hace que falle la funcionalidad de algun modo
    if (scrollContainer && 'scrollTo' in scrollContainer && typeof scrollContainer.scrollTo === 'function') {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
}, [autoScroll, messages]);

  useEffect(() => {
    if (!isMember || !autoScroll) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return;
    }

    if (lastMessage.user_id !== user?.id) {
      onMarkAsRead?.(room.id);
    }
  }, [autoScroll, isMember, messages, onMarkAsRead, room.id, user?.id]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const result = await sendMessage(content);

      if (result?.error) {
        setSendError(result.error);
        return result;
      }

      setSendError(null);
      return {};
    },
    [sendMessage]
  );

  const handleRetryMessage = useCallback(
    async (messageId: string) => {
      const result = await retryMessage(messageId);

      if (result?.error) {
        setSendError(result.error);
      }
    },
    [retryMessage]
  );

  const handleRetryWrapper = useCallback(
    (message: MessageWithMeta) => {
      void handleRetryMessage(message.id);
    },
    [handleRetryMessage]
  );

  const joinHelper = useCallback(async () => {
    if (!onJoinRoom) {
      return;
    }

    setJoinState({ loading: true, error: null });
    const result = await onJoinRoom(room.id);
    setJoinState({ loading: false, error: result?.error ?? null });
  }, [onJoinRoom, room.id]);

  const statusBanner = useMemo(() => {
    if (sendError) {
      return {
        tone: 'danger' as const,
        message: sendError,
        onClose: () => setSendError(null)
      };
    }

    if (messageError) {
      return {
        tone: 'warning' as const,
        message: messageError,
        onClose: clearError
      };
    }

    if (joinState.error) {
      return {
        tone: 'danger' as const,
        message: joinState.error,
        onClose: () => setJoinState((current: { loading: boolean; error: string | null }) => ({ ...current, error: null }))
      };
    }

    return null;
  }, [clearError, joinState.error, messageError, sendError]);

  if (!isMember) {
    return (
      <section className="space-y-4 rounded-2xl border border-chat-surface/60 bg-chat-surface/80 p-6 text-sm text-chat-muted shadow-xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Únete a la conversación</h3>
          <p>
            Esta sala es pública. Únete para empezar a enviar mensajes en tiempo real, recibir notificaciones y colaborar
            con el equipo.
          </p>
        </div>
        <button
          type="button"
          disabled={joinState.loading}
          onClick={() => void joinHelper()}
          className="inline-flex items-center justify-center rounded-full bg-chat-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-chat-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 disabled:opacity-60"
        >
          {joinState.loading ? 'Uniéndote...' : 'Unirme a la sala'}
        </button>
        {joinState.error ? <p className="text-xs text-chat-danger">{joinState.error}</p> : null}
      </section>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {statusBanner ? (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2 text-xs font-medium ${statusBanner.tone === 'danger'
            ? 'border-chat-danger/60 bg-chat-danger/15 text-chat-danger'
            : 'border-chat-warning/40 bg-chat-warning/15 text-chat-warning'
            }`}
        >
          <span>{statusBanner.message}</span>
          <button
            type="button"
            onClick={statusBanner.onClose}
            className="ml-4 rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-wide text-white/70 transition hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-chat-surface/60 bg-chat-surface/70">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="inset-0 flex flex-col space-y-6 overflow-y-auto px-4 py-6"
        >
          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="inline-flex items-center justify-center rounded-full border border-chat-surface/60 px-4 py-1 text-xs font-semibold text-chat-muted transition hover:text-white disabled:opacity-60"
              >
                {isLoadingMore ? 'Cargando...' : 'Cargar mensajes anteriores'}
              </button>
            </div>
          ) : null}

          {isInitialLoading ? (
            <p className="text-center text-sm text-chat-muted">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-chat-muted">Todavía no hay mensajes en esta sala.</p>
          ) : (
            <MessageList
              messages={messages}
              currentUserId={user?.id}
              typingUsers={typingUsers}
              onRetryMessage={handleRetryWrapper}
            />
          )}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>

      <MessageInput
        onSend={handleSendMessage}
        onTyping={notifyTyping}
        isDisabled={isInitialLoading}
        placeholder={`Enviar mensaje a ${room.displayName ?? room.name}`}
      />
    </div>
  );
}
