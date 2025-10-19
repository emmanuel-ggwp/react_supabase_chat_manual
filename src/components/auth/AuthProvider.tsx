import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthActionResult = {
  error?: string;
};

type SignInPayload = {
  email: string;
  password: string;
};

type SignUpPayload = {
  email: string;
  password: string;
  username: string;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (payload: SignInPayload) => Promise<AuthActionResult>;
  signUp: (payload: SignUpPayload) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadProfile = useCallback(
    async (userId: string, fallbackUsername?: string): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return data as Profile;
      }

      const { error: insertError, data: inserted } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: fallbackUsername ?? `user-${userId.slice(0, 8)}`,
          avatar_url: null
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!inserted) {
        throw new Error('Profile could not be created.');
      }

      return inserted as Profile;
    },
    []
  );

  const handleSessionChange = useCallback(
    async (session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }

      try {
        setStatus('loading');
        const nextProfile = await loadProfile(currentUser.id, currentUser.user_metadata?.username);
        setProfile(nextProfile);
        setStatus('authenticated');
      } catch (error) {
        console.error('Failed to load profile', error);
        setProfile(null);
        setStatus('authenticated');
      }
    },
    [loadProfile]
  );

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }
        return handleSessionChange(data.session ?? null);
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        handleSessionChange(session).catch((error: unknown) => {
          console.error('Auth state listener error', error);
        });
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [handleSessionChange]);

  const signIn = useCallback(async ({ email, password }: SignInPayload) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  const signUp = useCallback(
    async ({ email, password, username }: SignUpPayload) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { username }
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && data.session?.user) {
        try {
          await loadProfile(data.user.id, username);
        } catch (profileError) {
          console.error('Error creating profile after sign up', profileError);
          return { error: 'Se creó la cuenta pero hubo un problema al preparar el perfil.' };
        }
      }

      return {};
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const nextProfile = await loadProfile(user.id, user.user_metadata?.username);
      setProfile(nextProfile);
    } catch (error) {
      console.error('Failed to refresh profile', error);
    }
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      status: status === 'loading' && !isInitializing ? 'loading' : status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile
    }),
    [isInitializing, profile, resetPassword, signIn, signOut, signUp, status, user, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { AuthStatus, Profile, SignInPayload, SignUpPayload };
