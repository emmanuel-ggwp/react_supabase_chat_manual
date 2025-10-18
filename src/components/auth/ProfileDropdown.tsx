import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ChevronDown,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  SlidersHorizontal,
  UserRound,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks';

type ProfileDropdownProps = {
  onSignInRequest?: () => void;
};

type AuthFormState = {
  email: string;
  password: string;
};

const getIsMobileViewport = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < 640;
};

export function ProfileDropdown({ onSignInRequest }: ProfileDropdownProps) {
  const { status, isAuthenticated, isLoading, profile, user, signIn, signOut } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDesktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(getIsMobileViewport);
  const [formState, setFormState] = useState<AuthFormState>({ email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const authLoading = status === 'loading' || isLoading;

  const closeMenus = useCallback(() => {
    setDesktopMenuOpen(false);
    setMobileMenuOpen(false);
    setConfirmingLogout(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isDesktopMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setDesktopMenuOpen(false);
        setConfirmingLogout(false);
        setAuthError(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopMenuOpen(false);
        setMobileMenuOpen(false);
        setConfirmingLogout(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDesktopMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen, closeMenus]);

  

  const initials = useMemo(() => {
    const source = profile?.username ?? user?.email ?? 'SC';

    return source
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }, [profile?.username, user?.email]);

  const displayName = profile?.username ?? user?.user_metadata?.username ?? user?.email ?? 'Invitado';
  const secondaryLabel = user?.email ?? profile?.username ?? 'Sin correo disponible';

  const handleTriggerOpen = useCallback(() => {
    if (authLoading) {
      return;
    }

    if (isMobileViewport) {
      setMobileMenuOpen(true);
    } else {
      setDesktopMenuOpen((current) => !current);
    }

    if (!isAuthenticated) {
      onSignInRequest?.();
    }
  }, [authLoading, isMobileViewport, isAuthenticated, onSignInRequest]);

  const handleMouseLeave = useCallback(() => {
    if (isMobileViewport) {
      return;
    }

    setDesktopMenuOpen(false);
    setConfirmingLogout(false);
  }, [isMobileViewport]);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSignInSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      setAuthError(null);

      try {
        const { error } = await signIn({
          email: formState.email,
          password: formState.password
        });

        if (error) {
          setAuthError(error);
          return;
        }

        setFormState({ email: '', password: '' });
        closeMenus();
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState.email, formState.password, signIn, closeMenus]
  );

  const handleLogoutRequest = useCallback(() => {
    if (confirmingLogout) {
      setConfirmingLogout(false);
      return;
    }

    setConfirmingLogout(true);
    setAuthError(null);
  }, [confirmingLogout]);

  const handleLogoutConfirm = useCallback(async () => {
    setIsSigningOut(true);
    setAuthError(null);

    const { error } = await signOut();

    if (error) {
      setAuthError(error);
      setIsSigningOut(false);
      return;
    }

    setIsSigningOut(false);
    closeMenus();
  }, [signOut, closeMenus]);

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <img
          src={profile.avatar_url}
          alt={displayName}
          className="h-9 w-9 rounded-full object-cover shadow-inner"
        />
      );
    }

    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-chat-primary text-xs font-bold text-white">
        {initials}
      </span>
    );
  };

  const renderLoadingTrigger = () => (
    <div className="inline-flex h-10 w-32 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
      <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-2 w-16 rounded-full bg-white/10 animate-pulse" />
        <div className="h-2 w-12 rounded-full bg-white/5 animate-pulse" />
      </div>
    </div>
  );

  const accountOptions = useMemo(
    () => [
      {
        label: 'Mi perfil',
        description: 'Gestiona tu información y avatar',
        icon: UserRound
      },
      {
        label: 'Preferencias',
        description: 'Configura notificaciones y accesos directos',
        icon: SlidersHorizontal
      },
      {
        label: 'Ayuda y soporte',
        description: 'Resuelve dudas sobre el chat en tiempo real',
        icon: LifeBuoy
      }
    ],
    []
  );

  const renderAuthForm = (context: 'desktop' | 'mobile') => (
    <form onSubmit={handleSignInSubmit} className="space-y-4">
      <div className="space-y-2 text-xs text-chat-muted">
        <span className="uppercase tracking-[0.18em]">Correo electrónico</span>
        <label className="flex items-center gap-2 rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-3 py-2 transition focus-within:border-chat-primary focus-within:shadow-[0_0_0_2px_rgba(79,209,197,0.2)]">
          <Mail size={16} className="text-chat-muted" />
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={formState.email}
            onChange={handleInputChange}
            placeholder="tucorreo@ejemplo.com"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            required
          />
        </label>
      </div>

      <div className="space-y-2 text-xs text-chat-muted">
        <span className="uppercase tracking-[0.18em]">Contraseña</span>
        <label className="flex items-center gap-2 rounded-xl border border-chat-surface/60 bg-chat-surface/70 px-3 py-2 transition focus-within:border-chat-primary focus-within:shadow-[0_0_0_2px_rgba(79,209,197,0.2)]">
          <Lock size={16} className="text-chat-muted" />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={formState.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            className="w-full bg-transparent text-sm text-white placeholder:text-chat-muted focus:outline-none"
            required
          />
        </label>
      </div>

      {authError ? (
        <div className="rounded-xl border border-chat-danger/40 bg-chat-danger/10 px-3 py-2 text-xs text-chat-danger">
          {authError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !formState.email || !formState.password}
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

  const renderProfileMenu = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        {renderAvatar()}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{displayName}</p>
          <p className="text-xs text-chat-muted">{secondaryLabel}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-chat-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-chat-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-chat-primary" />
            Conectado
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {accountOptions.map(({ label, description, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={closeMenus}
            className="flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-2 text-left text-sm text-white transition hover:border-chat-primary/30 hover:bg-chat-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/40"
          >
            <Icon size={18} className="mt-0.5 text-chat-muted" />
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs text-chat-muted">{description}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {confirmingLogout ? (
          <div className="rounded-2xl border border-chat-danger/40 bg-chat-danger/10 p-3 text-sm text-chat-danger">
            <p className="font-semibold">¿Cerrar sesión?</p>
            <p className="mt-1 text-xs text-chat-danger/80">
              Tus mensajes seguirán sincronizados. Podrás volver a iniciar sesión cuando quieras.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={isSigningOut}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-chat-danger px-4 py-2 text-xs font-semibold text-white transition hover:bg-chat-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {isSigningOut ? 'Cerrando…' : 'Cerrar sesión'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingLogout(false)}
                className="inline-flex items-center justify-center rounded-full border border-chat-surface/60 px-4 py-2 text-xs font-semibold text-chat-muted transition hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogoutRequest}
            className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-chat-danger transition hover:bg-chat-danger/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-danger/40"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        )}

        {authError && !confirmingLogout ? (
          <div className="rounded-xl border border-chat-danger/40 bg-chat-danger/10 px-3 py-2 text-xs text-chat-danger">
            {authError}
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderDesktopMenu = () => (
    <div
      className={`absolute right-0 z-40 hidden min-w-[20rem] origin-top-right rounded-3xl border border-chat-surface/60 bg-chat-surface/95 p-5 shadow-2xl backdrop-blur transition-all duration-200 sm:block ${
        isDesktopMenuOpen ? 'pointer-events-auto translate-y-1 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
    >
      {authLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="h-10 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-10 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      ) : isAuthenticated ? (
        renderProfileMenu()
      ) : (
        renderAuthForm('desktop')
      )}
    </div>
  );

  const renderMobileSheet = () => (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 sm:hidden ${
          isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeMenus}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-3xl border border-chat-surface/60 bg-chat-surface/95 shadow-2xl transition-transform duration-300 sm:hidden ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {isAuthenticated ? 'Mi cuenta' : 'Iniciar sesión'}
            </p>
            <p className="text-xs text-chat-muted">
              {isAuthenticated
                ? 'Gestiona tus preferencias y presencia en el chat.'
                : 'Accede para participar en las conversaciones en tiempo real.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeMenus}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-chat-surface/60 text-chat-muted transition hover:text-white"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {authLoading ? (
            <div className="space-y-4">
              <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
              <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
              <div className="h-10 rounded-full bg-white/5 animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            renderProfileMenu()
          ) : (
            renderAuthForm('mobile')
          )}
        </div>
      </div>
    </>
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseLeave={handleMouseLeave}
    >
      {authLoading ? (
        renderLoadingTrigger()
      ) : (
        <button
          type="button"
          onClick={handleTriggerOpen}
          onMouseEnter={() => {
            if (!isMobileViewport) {
              setDesktopMenuOpen(true);
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-chat-surface/60 bg-chat-surface/80 px-3 py-2 text-sm font-semibold text-white transition hover:border-chat-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
          aria-haspopup="menu"
          aria-expanded={isDesktopMenuOpen || isMobileMenuOpen}
        >
          {renderAvatar()}
          <span className="hidden text-left text-sm leading-tight sm:block">
            <span className="block font-semibold text-white">{displayName}</span>
            <span className="block text-xs text-chat-muted">
              {isAuthenticated ? 'Disponible para chatear' : 'Invitado'}
            </span>
          </span>
          <ChevronDown size={16} className={`transition ${isDesktopMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {renderDesktopMenu()}
      {renderMobileSheet()}
    </div>
  );
}
