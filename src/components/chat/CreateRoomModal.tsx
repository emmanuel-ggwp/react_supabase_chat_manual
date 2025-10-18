import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z
    .string({ required_error: 'El nombre de la sala es obligatorio.' })
    .min(3, 'Debe tener al menos 3 caracteres.')
    .max(64, 'Debe tener un máximo de 64 caracteres.'),
  description: z
    .string()
    .max(240, 'Debe tener un máximo de 240 caracteres.')
    .optional()
    .or(z.literal('')),
  isPublic: z.boolean().default(true)
});

type CreateRoomValues = z.infer<typeof createRoomSchema>;

type CreateRoomModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateRoomValues) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
};

export function CreateRoomModal({ open, onClose, onSubmit, isSubmitting = false, error = null }: CreateRoomModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isFormSubmitting }
  } = useForm<CreateRoomValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: true
    }
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const submit = handleSubmit(async (values: CreateRoomValues) => {
    await onSubmit({
      ...values,
      description: values.description?.trim()
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-chat-surface/60 bg-chat-surface/95 p-6 shadow-2xl">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Crear nueva sala</h2>
          <p className="text-sm text-chat-muted">
            Organiza tus conversaciones agrupando a tu equipo en salas temáticas.
          </p>
        </header>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="room-name" className="text-sm font-medium text-slate-200">
              Nombre
            </label>
            <input
              id="room-name"
              type="text"
              autoComplete="off"
              className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
              placeholder="Equipo de producto"
              {...register('name')}
            />
            {errors.name ? <p className="text-xs text-chat-danger">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="room-description" className="text-sm font-medium text-slate-200">
              Descripción (opcional)
            </label>
            <textarea
              id="room-description"
              rows={4}
              className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
              placeholder="Comparte contexto sobre el propósito de la sala."
              {...register('description')}
            />
            {errors.description ? <p className="text-xs text-chat-danger">{errors.description.message}</p> : null}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-chat-surface/60 bg-chat-surface/80 p-4 text-sm text-chat-muted">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-chat-surface/60 bg-chat-surface/80 text-chat-primary focus:ring-chat-primary/70"
              {...register('isPublic')}
            />
            <span>
              <strong className="block font-semibold text-white">Sala pública</strong>
              <span className="text-xs text-chat-muted">
                Cualquier miembro autenticado podrá encontrar y unirse a esta sala.
              </span>
            </span>
          </label>

          {error ? <p className="rounded-lg bg-chat-danger/15 px-3 py-2 text-sm text-chat-danger">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-chat-surface/60 px-4 py-2 text-sm font-semibold text-chat-muted transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isFormSubmitting}
              className="inline-flex items-center justify-center rounded-lg bg-chat-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-chat-primary/90 disabled:cursor-not-allowed disabled:bg-chat-primary/60"
            >
              {isSubmitting || isFormSubmitting ? 'Creando...' : 'Crear sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
