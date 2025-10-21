import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

const mockProfile = {
  id: 'user-123',
  username: 'tester',
  email: 'demo@mail.com',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

type SupabaseMock = ReturnType<typeof createSupabaseMock>;

const createSupabaseMock = () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  const buildProfileQuery = () => {
    const query: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }))
    };

    return query;
  };

  return {
    getAuthCallback: () => authStateCallback,
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn((callback: any) => {
        authStateCallback = (_event: string, session: any) => callback(_event, session);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signInWithPassword: jest.fn(async ({ email }) => {
        const session = {
          user: {
            id: mockProfile.id,
            email,
            user_metadata: { username: mockProfile.username }
          }
        };
        authStateCallback?.('SIGNED_IN', session);
        return { data: { session }, error: null };
      }),
      signUp: jest.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signOut: jest.fn(async () => {
        authStateCallback?.('SIGNED_OUT', null);
        return { error: null };
      }),
      resetPasswordForEmail: jest.fn(async () => ({ error: null }))
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return buildProfileQuery();
      }
      throw new Error(`Unexpected table ${table}`);
    })
  };
};

let supabaseMock: SupabaseMock | undefined;

jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  get supabase() {
    if (!supabaseMock) {
      supabaseMock = createSupabaseMock();
    }
    return supabaseMock;
  }
}));

describe('Integración: flujo completo de autenticación', () => {
  beforeEach(() => {
    supabaseMock = createSupabaseMock();
  });

  const renderConsumer = () => {
    const AuthConsumer = () => {
      const { status, user, isAuthenticated, signIn, signOut } = useAuth();

      return (
        <div>
          <span data-testid="status">{status}</span>
          <span data-testid="auth">{isAuthenticated ? 'ok' : 'guest'}</span>
          <span data-testid="email">{user?.email ?? 'anon'}</span>
          <button onClick={() => signIn({ email: mockProfile.email, password: 'secret' })}>ingresar</button>
          <button onClick={() => signOut()}>salir</button>
        </div>
      );
    };

    return render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
  };

  it('permite iniciar y cerrar sesión actualizando el contexto', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('auth').textContent).toBe('guest');

    await user.click(screen.getByRole('button', { name: 'ingresar' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('auth').textContent).toBe('ok');
    expect(screen.getByTestId('email').textContent).toBe(mockProfile.email);

    await user.click(screen.getByRole('button', { name: 'salir' }));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('auth').textContent).toBe('guest');
  });
});
