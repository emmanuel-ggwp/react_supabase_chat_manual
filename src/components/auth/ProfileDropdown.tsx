import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/hooks';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ProfileMenu } from './ProfileMenu';

type ProfileDropdownProps = {
  onSignInRequest?: () => void;
};

const getIsMobileViewport = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < 640;
};

export function ProfileDropdown({ onSignInRequest }: ProfileDropdownProps) {
  const { status, isAuthenticated, isLoading, profile, user, signOut } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDesktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(getIsMobileViewport);
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');

  const authLoading = status === 'loading' || isLoading;

  const desktopCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDesktopCloseTimeout = useCallback(() => {
    if (desktopCloseTimeoutRef.current) {
      clearTimeout(desktopCloseTimeoutRef.current);
      desktopCloseTimeoutRef.current = null;
    }
  }, []);

  const scheduleDesktopClose = useCallback(() => {
    if (isMobileViewport) {
      return;
    }

    clearDesktopCloseTimeout();
    desktopCloseTimeoutRef.current = setTimeout(() => {
      setDesktopMenuOpen(false);
    }, 180);
  }, [clearDesktopCloseTimeout, isMobileViewport]);

  const showSignInView = useCallback(() => {
    setAuthView('signin');
  }, []);

  const showSignUpView = useCallback(() => {
    clearDesktopCloseTimeout();
    setAuthView('signup');
  }, [clearDesktopCloseTimeout]);

  const closeMenus = useCallback(() => {
    clearDesktopCloseTimeout();
    setDesktopMenuOpen(false);
    setMobileMenuOpen(false);
    showSignInView();
  }, [clearDesktopCloseTimeout, showSignInView]);

  useEffect(() => {
    return () => {
      clearDesktopCloseTimeout();
    };
  }, [clearDesktopCloseTimeout]);

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
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopMenuOpen(false);
        setMobileMenuOpen(false);
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

  useEffect(() => {
    if (isAuthenticated) {
      showSignInView();
    }
  }, [isAuthenticated, showSignInView]);

  

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
    clearDesktopCloseTimeout();

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
  }, [authLoading, clearDesktopCloseTimeout, isMobileViewport, isAuthenticated, onSignInRequest]);

  const handleMouseLeave = useCallback(() => {
    scheduleDesktopClose();
  }, [scheduleDesktopClose]);



  const handleLogout = useCallback(async () => {
    const { error } = await signOut();

    if (error) {
      return error;
    }

    closeMenus();
    return null;
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

  const renderDesktopMenu = () => (
    <div
      onMouseEnter={clearDesktopCloseTimeout}
      onMouseLeave={scheduleDesktopClose}
      className={`absolute right-0 top-full z-40 hidden min-w-[20rem] origin-top-right rounded-3xl border border-chat-surface/60 bg-chat-surface/95 p-5 shadow-2xl backdrop-blur transition-all duration-200 sm:block ${
        isDesktopMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
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
        <ProfileMenu
          avatar={renderAvatar()}
          displayName={displayName}
          secondaryLabel={secondaryLabel}
          onOptionSelect={closeMenus}
          onLogout={handleLogout}
        />
      ) : authView === 'signup' ? (
        <SignUpForm
          context="desktop"
          onSwitchToSignIn={showSignInView}
        />
      ) : (
        <LoginForm
          context="desktop"
          onSwitchToSignUp={showSignUpView}
        />
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
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-3xl border border-chat-surface/60 bg-chat-surface/95 shadow-2xl transition-transform duration-700 sm:hidden ${
          isMobileMenuOpen ? 'translate-y-full' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {isAuthenticated ? 'Mi cuenta' : authView === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
            </p>
            <p className="text-xs text-chat-muted">
              {isAuthenticated
                ? 'Gestiona tus preferencias y presencia en el chat.'
                : authView === 'signup'
                  ? 'Configura tus credenciales para comenzar a chatear en tiempo real.'
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
            <ProfileMenu
              avatar={renderAvatar()}
              displayName={displayName}
              secondaryLabel={secondaryLabel}
              onOptionSelect={closeMenus}
              onLogout={handleLogout}
            />
          ) : authView === 'signup' ? (
            <SignUpForm
              context="mobile"
              onSwitchToSignIn={showSignInView}
            />
          ) : (
            <LoginForm
              context="mobile"
              onSwitchToSignUp={showSignUpView}
            />
          )}
        </div>
      </div>
    </>
  );


  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={clearDesktopCloseTimeout}
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
              clearDesktopCloseTimeout();
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
