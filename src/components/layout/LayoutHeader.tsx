import { Menu } from 'lucide-react';
import { ProfileDropdown } from '@/components/auth';

export type NavigationItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

type LayoutHeaderProps = {
  navItems: NavigationItem[];
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
};

export function LayoutHeader({ navItems, onToggleSidebar, isSidebarOpen }: LayoutHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-chat-surface/60 bg-chat-surface/90/95 px-4 py-3 backdrop-blur-sm transition sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Mostrar u ocultar sidebar"
            aria-expanded={isSidebarOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-chat-surface/60 bg-chat-surface/80 text-chat-muted transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/70 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-chat-primary text-lg font-semibold text-white">
              SC
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-xs uppercase tracking-[0.2em] text-chat-muted">Realtime</p>
              <h1 className="text-lg font-bold text-white">Supabase Chat</h1>
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-2 text-sm font-medium text-chat-muted md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 ${
                item.isActive ? 'bg-chat-primary/20 text-white' : 'hover:text-white'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <nav className="flex md:hidden">
            {navItems.length > 0 ? (
              <a
                href={navItems[0].href}
                className="rounded-full border border-chat-surface/60 bg-chat-surface/80 px-4 py-2 text-xs font-semibold text-chat-muted transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
              >
                {navItems[0].label}
              </a>
            ) : null}
          </nav>
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
