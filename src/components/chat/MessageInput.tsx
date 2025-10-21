import { useEffect, useRef } from 'react';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip, Send, Smile } from 'lucide-react';

type MessageInputProps = {
  onSend: (content: string) => Promise<{ error?: string } | void>;
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

/**
 * Área de entrada multilinea con validación y controles auxiliares para enviar mensajes del chat.
 */
export function MessageInput({ onSend, onTyping, isDisabled = false, placeholder = 'Escribe un mensaje...' }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
    const result = await onSend(content);

    if (result && 'error' in result && result.error) {
      setError('content', { message: result.error });
      return;
    }

    reset({ content: '' });
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
            className="w-full resize-none rounded-xl border border-transparent bg-chat-surface/70 px-4 py-3 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/40"
          />
          {errors.content ? <p className="mt-1 text-xs text-chat-danger">{errors.content.message}</p> : null}
        </div>

        <div className="flex items-center gap-2">
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
