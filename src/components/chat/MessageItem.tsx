import { memo, useMemo } from 'react';
import { AlertCircle, CheckCheck, Clock } from 'lucide-react';
import type { MessageWithMeta } from '@/hooks/useMessages';
import { formatRelativeTime } from '@/utils';

type MessageItemProps = {
  message: MessageWithMeta;
  isOwn: boolean;
  showAvatar: boolean;
  showUsername: boolean;
  onRetry?: (message: MessageWithMeta) => void;
};

function getStatusIcon(status: MessageWithMeta['status']) {
  switch (status) {
    case 'sending':
      return <Clock size={14} className="text-chat-muted" aria-label="Enviando" />;
    case 'error':
      return <AlertCircle size={14} className="text-chat-danger" aria-label="Error" />;
    case 'sent':
    default:
      return <CheckCheck size={14} className="text-chat-primary" aria-label="Enviado" />;
  }
}

export const MessageItem = memo(function MessageItem({ message, isOwn, showAvatar, showUsername, onRetry }: MessageItemProps) {
  const displayName = message.profile?.username ?? 'Usuario';
  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join(''),
    [displayName]
  );

  const timestampLabel = formatRelativeTime(message.created_at);
  const statusIcon = getStatusIcon(message.status);

  const bubbleStyles = isOwn
    ? 'ml-auto rounded-t-2xl rounded-bl-2xl bg-chat-primary text-white'
    : 'mr-auto rounded-t-2xl rounded-br-2xl bg-chat-surface/90 text-chat-muted';

  const containerAlign = isOwn ? 'items-end' : 'items-start';
  const wrapperAlign = isOwn ? 'ml-auto justify-end' : '';
  const contentAlign = isOwn ? 'text-right' : 'text-left';

  return (
    <div className={`flex ${containerAlign} ${wrapperAlign} gap-3 text-sm`}>
      {!isOwn && showAvatar ? (
        <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-chat-secondary/30 text-xs font-semibold text-chat-secondary">
          {initials || displayName.charAt(0).toUpperCase()}
        </span>
      ) : (
        <span className="h-8 w-8" aria-hidden />
      )}

      <div className={`max-w-[70%] space-y-1 ${contentAlign}`}>
        {!isOwn && showUsername ? <p className="text-xs uppercase tracking-wide text-chat-muted/80">{displayName}</p> : null}

        <div className={`relative w-full rounded-3xl px-4 py-2 shadow-sm ${bubbleStyles}`}>
          {message.message_type === 'image' ? (
            <span className="text-xs italic text-chat-muted">Contenido de imagen no disponible en esta vista previa.</span>
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
          )}
          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-white/70">
            <span>{timestampLabel}</span>
            {isOwn ? statusIcon : null}
          </div>
          {isOwn && message.status === 'error' ? (
            <button
              type="button"
              onClick={() => onRetry?.(message)}
              className="mt-2 inline-flex items-center gap-2 rounded-full border border-chat-danger/60 px-3 py-1 text-[11px] font-semibold text-chat-danger transition hover:bg-chat-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-danger/40"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      </div>

      {isOwn && showAvatar ? (
        <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-chat-primary/25 text-xs font-semibold text-chat-primary">
          {initials || displayName.charAt(0).toUpperCase()}
        </span>
      ) : null}
    </div>
  );
});
