import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ProfileDropdown } from './ProfileDropdown';
import { AuthContext } from './AuthProvider';
import type { Profile, AuthStatus } from './AuthProvider';
import type { User } from '@supabase/supabase-js';

const user: User = {
  id: 'user-1',
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo@mail.com',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  confirmed_at: new Date().toISOString(),
  identities: [],
  user_metadata: {
    username: 'demo'
  }
};

const profile: Profile = {
  id: user.id,
  username: 'demo',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const buildAuthValue = (status: AuthStatus) => ({
  user: status === 'authenticated' ? user : null,
  profile: status === 'authenticated' ? profile : null,
  status,
  isAuthenticated: status === 'authenticated',
  isLoading: status === 'loading',
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => ({}),
  resetPassword: async () => ({}),
  refreshProfile: async () => {}
});

const meta: Meta<typeof ProfileDropdown> = {
  title: 'Auth/ProfileDropdown',
  component: ProfileDropdown,
  args: {
    onSignInRequest: () => {}
  },
  decorators: [
    (Story, context) => {
      const status = (context.parameters as { authStatus?: AuthStatus }).authStatus ?? 'authenticated';
      const value = buildAuthValue(status);
      return (
        <AuthContext.Provider value={value}>
          <div className="w-full max-w-sm">
            <Story />
          </div>
        </AuthContext.Provider>
      );
    }
  ],
  parameters: {
    authStatus: 'authenticated'
  }
};

export default meta;

type Story = StoryObj<typeof ProfileDropdown>;

export const Authenticated: Story = {};

export const Loading: Story = {
  parameters: {
    authStatus: 'loading' as AuthStatus
  }
};

export const Unauthenticated: Story = {
  parameters: {
    authStatus: 'unauthenticated' as AuthStatus
  }
};
