import { ComponentType, ReactNode } from 'react';
import { useAuth } from '@/hooks';

type AuthGuardOptions = {
  fallback?: ReactNode;
  loading?: ReactNode;
};

export function withAuthGuard<P extends object>(
  Component: ComponentType<P>,
  options: AuthGuardOptions = {}
): ComponentType<P> {
  function GuardedComponent(props: P) {
    const { isAuthenticated, status } = useAuth();

    if (status === 'loading') {
      return options.loading ?? <div className="text-sm text-chat-muted">Verificando sesión…</div>;
    }

    if (!isAuthenticated) {
      return options.fallback ?? <div className="text-sm text-chat-danger">Acceso restringido.</div>;
    }

    return <Component {...props} />;
  }

  GuardedComponent.displayName = `withAuthGuard(${Component.displayName ?? Component.name ?? 'Component'})`;

  return GuardedComponent;
}
