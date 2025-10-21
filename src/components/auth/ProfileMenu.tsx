import type { ReactNode } from 'react';
import { LifeBuoy, SlidersHorizontal, UserRound } from 'lucide-react';
import { LogoutForm } from './LogoutForm';

const ACCOUNT_OPTIONS = [
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
];

type ProfileMenuProps = {
  avatar: ReactNode;
  displayName: string;
  secondaryLabel: string;
  onOptionSelect: () => void;
  onLogout: () => Promise<string | null>;
};

export function ProfileMenu({ avatar, displayName, secondaryLabel, onOptionSelect, onLogout }: ProfileMenuProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        {avatar}
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
        {ACCOUNT_OPTIONS.map(({ label, description, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={onOptionSelect}
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

      <LogoutForm onLogout={onLogout} />
    </div>
  );
}
