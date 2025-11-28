import { useEffect, useRef, WheelEvent as ReactWheelEvent } from 'react';
import { Pin } from 'lucide-react';
import type { PinnedMessageMeta } from './MessageList';

type PinnedMessagesBarProps = {
  messages: PinnedMessageMeta[];
  onSelect: (id: string) => void;
};

export function PinnedMessagesBar({ messages, onSelect }: PinnedMessagesBarProps) {
  if (messages.length === 0) return null;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement> | WheelEvent) => {
    const container = scrollRef.current;
    if (!container) return;

    // Bloquear el scroll vertical del chat mientras la rueda está sobre la barra
    event.preventDefault();

    // Trasladar el scroll vertical/horizontal de la rueda a desplazamiento horizontal suave
    const anyEvent = event as WheelEvent;
    const delta = anyEvent.deltaY || anyEvent.deltaX || 0;
    container.scrollLeft += delta * 0.3;
  };

  // Usar un listener no-passive para garantizar que preventDefault bloquee el scroll vertical
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const listener = (e: WheelEvent) => handleWheel(e);
    el.addEventListener('wheel', listener, { passive: false });

    return () => {
      el.removeEventListener('wheel', listener);
    };
  }, []);

  return (
    <div className="flex w-full justify-center px-12">
      <div className="flex max-w-full items-center gap-2 rounded-full border border-chat-surface/80 bg-chat-surface/95 px-3 py-1.5 text-xs text-chat-muted shadow-sm backdrop-blur">
        <Pin size={12} className="shrink-0 text-chat-secondary" />
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth scrollbar-soft"
        >
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onSelect(msg.id)}
              className="max-w-[150px] shrink-0 truncate font-medium hover:text-chat-primary hover:underline focus:outline-none"
              title={`Ir al mensaje de ${msg.author}`}
            >
              {msg.preview}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
