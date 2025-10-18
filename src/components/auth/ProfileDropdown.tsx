import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks';

type ProfileDropdownProps = {
  onSignInRequest?: () => void;
};

export function ProfileDropdown({ onSignInRequest }: ProfileDropdownProps) {
  const { isAuthenticated, profile, user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const initials = (profile?.username ?? user?.email ?? 'SC')
    .split(' ')
  .map((part: string) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  const handleToggle = () => {
  setIsMenuOpen((current: boolean) => !current);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      console.error('Error al cerrar sesión', error);
    }
    setIsSigningOut(false);
    setIsMenuOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onSignInRequest}
        className="inline-flex items-center gap-2 rounded-full border border-chat-primary/50 px-4 py-2 text-sm font-semibold text-chat-primary transition hover:bg-chat-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
      >
        Iniciar sesión
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 rounded-full border border-chat-surface/60 bg-chat-surface/80 px-3 py-2 text-sm font-semibold text-white transition hover:border-chat-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-chat-primary text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-left text-sm leading-tight sm:block">
          <span className="block font-semibold text-white">{profile?.username ?? 'Usuario'}</span>
          <span className="block text-xs text-chat-muted">{user?.email}</span>
        </span>
        <ChevronDown size={16} className={`transition ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMenuOpen ? (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-chat-surface/60 bg-chat-surface/90 p-2 shadow-xl">
          <div className="rounded-lg bg-chat-surface/70 px-3 py-2 text-xs text-chat-muted">
            <p className="font-semibold text-white">{profile?.username}</p>
            <p>{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-chat-danger transition hover:bg-chat-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={16} />
            {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
