import { useState } from 'react';
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

type LoginValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn, resetPassword } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values: LoginValues) => {
    setFormError(null);
    setInfoMessage(null);
    const { error } = await signIn(values);

    if (error) {
      setFormError(error);
      return;
    }

    setInfoMessage('Sesión iniciada correctamente.');
    onSuccess?.();
  });

  const handleResetPassword = async () => {
    const email = getValues('email');

    if (!email) {
      setFormError('Ingresa tu correo electrónico para recuperar la contraseña.');
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      setFormError(error);
      return;
    }

    setInfoMessage('Revisa tu correo electrónico para continuar con el proceso de recuperación.');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-chat-surface/60 bg-chat-surface/80 p-6 shadow-lg">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Iniciar sesión</h2>
        <p className="text-sm text-chat-muted">Accede con tus credenciales para continuar.</p>
      </header>

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
          autoComplete="current-password"
          className="w-full rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-2 text-sm text-white placeholder:text-chat-muted focus:border-chat-primary/70 focus:outline-none focus:ring-2 focus:ring-chat-primary/40"
          placeholder="••••••••"
          {...register('password')}
        />
        {errors.password ? <p className="text-xs text-chat-danger">{errors.password.message}</p> : null}
      </div>

      {formError ? <p className="rounded-lg bg-chat-danger/20 px-3 py-2 text-sm text-chat-danger">{formError}</p> : null}
      {infoMessage ? <p className="rounded-lg bg-chat-success/20 px-3 py-2 text-sm text-chat-success">{infoMessage}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-lg bg-chat-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-chat-primary/90 disabled:cursor-not-allowed disabled:bg-chat-primary/60 sm:w-auto"
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
        <button
          type="button"
          onClick={handleResetPassword}
          className="text-sm font-medium text-chat-muted transition hover:text-chat-primary"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    </form>
  );
}
