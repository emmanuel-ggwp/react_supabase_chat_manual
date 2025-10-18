import { useMemo } from 'react';
import type { MessageWithMeta } from '@/hooks/useMessages';
import { MessageItem } from './MessageItem';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});

type MessageListProps = {
  messages: MessageWithMeta[];
  currentUserId?: string;
  typingUsers?: string[];
  onRetryMessage?: (message: MessageWithMeta) => void;
};

type GroupedMessages = {
  key: string;
  label: string;
  items: MessageWithMeta[];
};

export function MessageList({ messages, currentUserId, typingUsers = [], onRetryMessage }: MessageListProps) {
  const grouped = useMemo<GroupedMessages[]>(() => {
    const groups = new Map<string, MessageWithMeta[]>();

    messages.forEach((message) => {
      const dateKey = message.created_at.slice(0, 10);
      const existing = groups.get(dateKey) ?? [];
      existing.push(message);
      groups.set(dateKey, existing);
    });

    return Array.from(groups.entries()).map<GroupedMessages>(([key, items]) => {
      const dateLabel = dateFormatter.format(new Date(items[0]?.created_at ?? key));
      return {
        key,
        label: dateLabel,
        items
      };
    });
  }, [messages]);

  return (
    <div className="space-y-6">
      {grouped.map((group: GroupedMessages) => (
        <section key={group.key} className="space-y-4">
          <div className="text-center text-[11px] uppercase tracking-[0.4em] text-chat-muted/60">
            {group.label}
          </div>

          <div className="space-y-4">
            {group.items.map((message: MessageWithMeta, index: number) => {
              const isOwn = message.user_id === currentUserId;
              const previous = group.items[index - 1];
              const next = group.items[index + 1];

              const showUsername = !isOwn && (!previous || previous.user_id !== message.user_id);
              const showAvatar = !isOwn && (!next || next.user_id !== message.user_id);

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  showUsername={showUsername}
                  onRetry={onRetryMessage}
                />
              );
            })}
          </div>
        </section>
      ))}

      {typingUsers.length > 0 ? (
        <p className="text-xs italic text-chat-muted">
          {typingUsers.length === 1
            ? `${typingUsers[0]} está escribiendo...`
            : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ' y más' : ''} están escribiendo...`}
        </p>
      ) : null}
    </div>
  );
}
