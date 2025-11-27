import { useEffect, useRef, useState } from 'react';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, Send, Smile, Timer, TimerOff } from 'lucide-react';

type MessageInputProps = {
  onSend: (content: string, expiresIn?: number) => Promise<{ error?: string } | void>;
  onTyping?: () => void;
  isDisabled?: boolean;
  placeholder?: string;
};

const messageSchema = z.object({
  content: z
    .string()
    .transform((value: string) => value.trimEnd())
    .refine((value: string) => value.trim().length > 0, {
      message: 'Escribe un mensaje para continuar.'
    })
});

type MessageFormValues = z.infer<typeof messageSchema>;

const EXPIRATION_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '10s', value: 10 },
  { label: '1m', value: 60 },
  { label: '1h', value: 3600 },
  { label: '24h', value: 86400 }
];

/**
 * Área de entrada multilinea con validación y controles auxiliares para enviar mensajes del chat.
 */
export function MessageInput({ onSend, onTyping, isDisabled = false, placeholder = 'Escribe un mensaje...' }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [expiration, setExpiration] = useState<number>(0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' }
  });

  const {
    ref: registerRef,
    onChange: fieldOnChange,
    ...field
  } = register('content');

  const contentValue = watch('content');

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [contentValue]);

  const submitMessage = handleSubmit(async ({ content }: MessageFormValues) => {
    const result = await onSend(content, expiration > 0 ? expiration : undefined);

    if (result && 'error' in result && result.error) {
      setError('content', { message: result.error });
      return;
    }

    reset({ content: '' });
    // Opcional: resetear timer después de enviar
    // setExpiration(0); 
  });

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    fieldOnChange(event);
    onTyping?.();
  };

  return (
    <form onSubmit={submitMessage} className="rounded-2xl border border-chat-surface/60 bg-chat-surface/80 p-4 shadow-lg">
      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col">
          <textarea
            {...field}
            ref={(element: HTMLTextAreaElement | null) => {
              textareaRef.current = element;
              registerRef(element);
            }}
            rows={1}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            disabled={isDisabled || isSubmitting}
            data-testid="message-input"
            className="w-full resize-none rounded-xl border border-transparent bg-chat-surface/70 px-4 py-3 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/40"
          />
          {errors.content ? <p className="mt-1 text-xs text-chat-danger">{errors.content.message}</p> : null}
        </div>

        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              disabled={isDisabled || isSubmitting}
              data-testid="timer-button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                expiration > 0 
                  ? 'border-chat-primary text-chat-primary bg-chat-primary/10' 
                  : 'border-chat-surface/60 text-chat-muted/80 hover:text-white'
              }`}
              title="Autodestrucción"
            >
              {expiration > 0 ? <Timer size={16} /> : <TimerOff size={16} />}
            </button>
            
            {showTimerMenu && (
              <div className="absolute bottom-full mb-2 right-0 w-32 rounded-xl border border-chat-surface/60 bg-chat-surface shadow-xl overflow-hidden z-10">
                {EXPIRATION_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setExpiration(option.value);
                      setShowTimerMenu(false);
                    }}
                    data-testid={`timer-option-${option.value}`}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                      expiration === option.value ? 'text-chat-primary font-medium' : 'text-chat-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-chat-surface/60 text-chat-muted/80"
            title="Adjuntar archivo"
          >
            <Paperclip size={16} />
          </button>


          <button
            type="button"
            disabled
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-chat-surface/60 text-chat-muted/80"
            title="Insertar emoji"
          >
            <Smile size={16} />
          </button>

          <button
            type="submit"
            disabled={isDisabled || isSubmitting}
            data-testid="send-button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-chat-primary text-white transition hover:bg-chat-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 disabled:opacity-60"
            title="Enviar mensaje"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </form>
  );
}
