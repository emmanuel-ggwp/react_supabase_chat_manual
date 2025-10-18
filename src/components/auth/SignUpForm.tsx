import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks';

const passwordPattern = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$');

const signUpSchema = z
  .object({
    email: z.string({ required_error: 'El correo es obligatorio.' }).email('Ingresa un correo válido.'),
    password: z
      .string({ required_error: 'La contraseña es obligatoria.' })
      .min(8, 'Debe tener al menos 8 caracteres.')
      .regex(passwordPattern, 'Debe incluir mayúsculas, minúsculas y números.'),
    confirmPassword: z.string({ required_error: 'Confirma tu contraseña.' }),
    username: z
      .string({ required_error: 'El nombre de usuario es obligatorio.' })
      .min(3, 'Debe tener al menos 3 caracteres.')
      .max(24, 'Debe tener máximo 24 caracteres.')
      .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos.')
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.'
  });

type SignUpValues = z.infer<typeof signUpSchema>;

type SignUpFormProps = {
  onSuccess?: () => void;
};

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: ''
    }
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const onSubmit = handleSubmit(async ({ email, password, username }: SignUpValues) => {
    setFormError(null);
    setInfoMessage(null);
    const { error } = await signUp({ email, password, username });

    if (error) {
      setFormError(error);
      return;
    }

    setInfoMessage('Hemos enviado un correo para confirmar tu cuenta.');
    reset();
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-chat-surface/60 bg-chat-surface/80 p-6 shadow-lg">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Crear cuenta</h2>
        <p className="text-sm text-chat-muted">Regístrate para comenzar a usar el chat en tiempo real.</p>
      </header>

      <div className="space-y-1">
        <label htmlFor="username" className="text-sm font-medium text-slate-200">
          Nombre de usuario
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
          placeholder="usuario123"
          {...register('username')}
        />
        {errors.username ? <p className="text-xs text-chat-danger">{errors.username.message}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
          placeholder="tucorreo@ejemplo.com"
          {...register('email')}
        />
        {errors.email ? <p className="text-xs text-chat-danger">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
          placeholder="••••••••"
          {...register('password')}
        />
        {errors.password ? <p className="text-xs text-chat-danger">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
          placeholder="••••••••"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? <p className="text-xs text-chat-danger">{errors.confirmPassword.message}</p> : null}
      </div>

      {formError ? <p className="rounded-lg bg-chat-danger/20 px-3 py-2 text-sm text-chat-danger">{formError}</p> : null}
      {infoMessage ? <p className="rounded-lg bg-chat-success/20 px-3 py-2 text-sm text-chat-success">{infoMessage}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-lg bg-chat-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-chat-secondary/90 disabled:cursor-not-allowed disabled:bg-chat-secondary/60"
      >
        {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}
