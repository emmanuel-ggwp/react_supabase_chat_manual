import { jest } from '@jest/globals';

const createSupabaseStub = () => {
  const subscription = {
    unsubscribe: jest.fn()
  };

  const auth = {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription } })),
    signInWithPassword: jest.fn(async () => ({ data: { session: null }, error: null })),
    signUp: jest.fn(async () => ({ data: { user: null, session: null }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ error: null }))
  };

  const queryBuilder = () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
      single: jest.fn(async () => ({ data: null, error: null }))
    };

    return chain;
  };

  const channels = new Map<string, any>();

  return {
    auth,
    channel: jest.fn((name: string) => {
      const channel = {
        name,
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn()
      };
      channels.set(name, channel);
      return channel;
    }),
    removeChannel: jest.fn((channel: { name?: string }) => {
      if (channel?.name) {
        channels.delete(channel.name);
      }
    }),
    from: jest.fn(() => queryBuilder())
  };
};

const supabase = createSupabaseStub();

export { supabase, createSupabaseStub };
