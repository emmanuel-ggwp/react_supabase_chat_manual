import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';

type LogoutFormProps = {
  onLogout: () => Promise<string | null>;
};

export function LogoutForm({ onLogout }: LogoutFormProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = () => {
    if (isSubmitting) {
      return;
    }

    setIsConfirming(true);
    setError(null);
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    setIsConfirming(false);
    setError(null);
  };

  const handleConfirm = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onLogout();

      if (result) {
        setError(result);
        return;
      }

      setIsConfirming(false);
    } catch (unknownError) {
      console.error('Failed to sign out', unknownError);
      setError('No pudimos cerrar tu sesión. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {isConfirming ? (
        <div className="rounded-2xl border border-chat-danger/40 bg-chat-danger/10 p-3 text-sm text-chat-danger">
          <p className="font-semibold">¿Cerrar sesión?</p>
          <p className="mt-1 text-xs text-chat-danger/80">
            Tus mensajes seguirán sincronizados. Podrás volver a iniciar sesión cuando quieras.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-chat-danger px-4 py-2 text-xs font-semibold text-white transition hover:bg-chat-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              {isSubmitting ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-full border border-chat-surface/60 px-4 py-2 text-xs font-semibold text-chat-muted transition hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleRequest}
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-chat-danger transition hover:bg-chat-danger/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-danger/40"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      )}

      {error ? (
        <div className="rounded-xl border border-chat-danger/40 bg-chat-danger/10 px-3 py-2 text-xs text-chat-danger">
          {error}
        </div>
      ) : null}
    </div>
  );
}
