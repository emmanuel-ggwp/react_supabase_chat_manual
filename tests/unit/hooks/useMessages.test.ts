import { renderHook, act } from '@testing-library/react';
import { useMessages } from '@/hooks/useMessages';
import { supabase } from '@/lib/supabase';

// Mock de useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { username: 'TestUser' }
  })
}));

// Mock de Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn()
  }
}));

describe('useMessages Hook - Autodestrucción', () => {
  const mockInsert = jest.fn();
  const mockSelect = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Setup Supabase mocks
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'msg-1', created_at: '2024-01-01T12:00:00Z' }, error: null })
      })
    });

    // Chain for select query
    const mockOr = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockLt = jest.fn().mockReturnValue({ or: mockOr });
    const mockLimit = jest.fn().mockReturnValue({ lt: mockLt, or: mockOr });
    const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    
    mockSelect.mockReturnValue({
      eq: mockEq
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      insert: mockInsert
    });

    (supabase.channel as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback) => {
        if (callback) callback('SUBSCRIBED');
        return { unsubscribe: jest.fn() };
      }),
      send: jest.fn(),
      unsubscribe: jest.fn()
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería calcular correctamente expires_at al enviar mensaje', async () => {
    const { result } = renderHook(() => useMessages('room-1'));
    
    const mockDate = new Date('2024-01-01T12:00:00Z');
    jest.setSystemTime(mockDate);

    await act(async () => {
      await result.current.sendMessage('Mensaje temporal', 60);
    });

    expect(mockInsert).toHaveBeenCalled();
    const insertedData = mockInsert.mock.calls[0][0];
    expect(insertedData.expires_at).toBe('2024-01-01T12:01:00.000Z');
  });

  it('debería enviar null en expires_at si no se especifica tiempo', async () => {
    const { result } = renderHook(() => useMessages('room-1'));

    await act(async () => {
      await result.current.sendMessage('Mensaje permanente');
    });

    expect(mockInsert).toHaveBeenCalled();
    const insertedData = mockInsert.mock.calls[0][0];
    expect(insertedData.expires_at).toBeNull();
  });
});
