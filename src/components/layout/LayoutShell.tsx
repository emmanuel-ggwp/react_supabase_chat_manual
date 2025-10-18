import type { PropsWithChildren } from 'react';

export function LayoutShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-chat-background text-white">
      {children}
    </div>
  );
}
