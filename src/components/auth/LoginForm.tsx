import { Mail, Lock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks';

const loginSchema = z.object({
  email: z.string({ required_error: 'El correo es obligatorio.' }).email('Ingresa un correo válido.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
});

export type ProfileAuthFormState = z.infer<typeof loginSchema>;

export type LoginFormProps = {
  context: 'desktop' | 'mobile';
  onSwitchToSignUp: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function LoginForm({
  context,
  onSwitchToSignUp,
  onDirtyChange
}: LoginFormProps) {
  const { signIn, resetPassword } = useAuth();

  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
    reset,
    getValues
  } = useForm<ProfileAuthFormState>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setInfoMessage(null);

    const trimmedEmail = values.email.trim();
    const error = await signIn({ ...values, email: trimmedEmail });

    if (error) {
      setFormError(error?.error || 'Ocurrió un error al iniciar sesión.');
      return;
    }

    setInfoMessage('Sesión iniciada correctamente.');
    reset({ email: trimmedEmail, password: '' });
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleResetPassword = async () => {

    setFormError(null);
    setInfoMessage(null);

    const email = getValues('email').trim();

    if (!email) {
      setFormError('Ingresa tu correo electrónico para recuperar la contraseña.');
      return;
    }

    const error = await resetPassword(email);

    if (error) {
      setFormError(error.error || 'Ocurrió un error al intentar restablecer la contraseña.');
      return;
    }

    setInfoMessage('Revisa tu correo electrónico para continuar con el proceso de recuperación.');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2 text-xs text-chat-muted">
        <span className="uppercase tracking-[0.18em]">Correo electrónico</span>
        <label className="flex items-center gap-2 rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-3 py-2 transition focus-within:border-chat-primary focus-within:shadow-[0_0_0_2px_rgba(79,209,197,0.2)]">
          <Mail size={16} className="text-chat-muted" />
          <input
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            {...register('email')}
            data-testid={`login-email-${context}`}
            required
          />
        </label>
        {errors.email ? <p className="text-xs text-chat-danger">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2 text-xs text-chat-muted">
        <span className="uppercase tracking-[0.18em]">Contraseña</span>
        <label className="flex items-center gap-2 rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-3 py-2 transition focus-within:border-chat-primary focus-within:shadow-[0_0_0_2px_rgba(79,209,197,0.2)]">
          <Lock size={16} className="text-chat-muted" />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            {...register('password')}
            data-testid={`login-password-${context}`}
            required
          />
        </label>
        {errors.password ? <p className="text-xs text-chat-danger">{errors.password.message}</p> : null}
      </div>

      {formError ? (
        <div className="rounded-xl border border-chat-danger/40 bg-chat-danger/10 px-3 py-2 text-xs text-chat-danger">
          {formError}
        </div>
      ) : null}

      {infoMessage ? (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
          {infoMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          data-testid={`login-submit-${context}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-chat-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-chat-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Ingresando…
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="w-full text-center text-xs font-semibold text-chat-primary transition hover:text-white"
        >
          Crear cuenta
        </button>

        <button
          type="button"
          onClick={handleResetPassword}
          className="text-xs font-semibold text-chat-muted transition hover:text-chat-primary"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {context === 'mobile' ? (
        <p className="text-center text-xs text-chat-muted">
          Tu sesión se sincroniza en tiempo real con Supabase.
        </p>
      ) : (
        <p className="text-xs text-chat-muted">
          Conéctate para enviar mensajes y recibir notificaciones instantáneas.
        </p>
      )}
    </form>
  );
}
