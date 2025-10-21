import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks';

const passwordPattern = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$');

const profileSignUpSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .email('Ingresa un correo válido.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(8, 'Debe tener al menos 8 caracteres.')
    .regex(passwordPattern, 'Debe incluir mayúsculas, minúsculas y números.'),
  username: z
    .string({ required_error: 'El nombre de usuario es obligatorio.' })
    .min(3, 'Debe tener al menos 3 caracteres.')
    .max(24, 'Debe tener máximo 24 caracteres.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos.')
});

export type SignUpFormValues = z.infer<typeof profileSignUpSchema>;

export type SignUpFormProps = {
  context: 'desktop' | 'mobile';
  onSwitchToSignIn: () => void;
  onSuccess?: () => void;
};

export function SignUpForm({ context, onSwitchToSignIn, onSuccess }: SignUpFormProps) {
  const { signUp } = useAuth();


  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(profileSignUpSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', username: '' }
  });



  const onSignUp = useCallback(
    async ({ email, password, username }: SignUpFormValues) => {
      const trimmedEmail = email.trim();
      const trimmedUsername = username.trim();

      const { error } = await signUp({ email: trimmedEmail, password, username: trimmedUsername });

      if (error) {
        return error;
      }

      return null;
    },
    [signUp]
  );

  const onSubmit = handleSubmit(async ({ email, password, username }) => {
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    setFormError(null);
    setSuccessMessage(null);

    const error = await onSignUp({ email: trimmedEmail, password, username: trimmedUsername });

    if (error) {
      setFormError(error);
      return;
    }

    setSuccessMessage('Hemos enviado un correo para confirmar tu cuenta.');
    reset();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError ? (
        <div className="rounded-xl border border-chat-danger/40 bg-chat-danger/10 px-3 py-2 text-xs text-chat-danger">
          {formError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 size={16} className="mt-0.5" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      <div className="space-y-2 text-xs text-chat-muted">
        <span className="uppercase tracking-[0.18em]">Nombre de usuario</span>
        <label className="flex items-center gap-2 rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-3 py-2 transition focus-within:border-chat-primary focus-within:shadow-[0_0_0_2px_rgba(79,209,197,0.2)]">
          <UserRound size={16} className="text-chat-muted" />
          <input
            type="text"
            {...register('username')}
            placeholder="Tu nombre en el chat"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            autoComplete="username"
            required
          />
        </label>
        {errors.username ? <p className="text-xs text-chat-danger">{errors.username.message}</p> : null}
      </div>

      <div className="space-y-2 text-xs text-chat-muted">
        <span className="uppercase tracking-[0.18em]">Correo electrónico</span>
        <label className="flex items-center gap-2 rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-3 py-2 transition focus-within:border-chat-primary focus-within:shadow-[0_0_0_2px_rgba(79,209,197,0.2)]">
          <Mail size={16} className="text-chat-muted" />
          <input
            type="email"
            {...register('email')}
            placeholder="tucorreo@ejemplo.com"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            autoComplete="email"
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
            {...register('password')}
            placeholder="Mínimo 8 caracteres"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {errors.password ? <p className="text-xs text-chat-danger">{errors.password.message}</p> : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-chat-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-chat-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creando cuenta…
          </>
        ) : (
          'Crear cuenta'
        )}
      </button>

      <button
        type="button"
        onClick={onSwitchToSignIn}
        className="w-full text-center text-xs font-semibold text-chat-muted transition hover:text-white"
      >
        ¿Ya tienes cuenta? Inicia sesión
      </button>

      {context === 'mobile' ? (
        <p className="text-center text-xs text-chat-muted">
          Recibirás un correo para confirmar tu cuenta antes de ingresar al chat.
        </p>
      ) : (
        <p className="text-xs text-chat-muted">
          Al registrarte podrás participar en salas públicas y recibir notificaciones en tiempo real.
        </p>
      )}
    </form>
  );
}
