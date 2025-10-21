import { act, renderHook } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retorna el valor inicial inmediatamente', () => {
    const { result } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'hola' }
    });

    expect(result.current).toBe('hola');
  });

  it('actualiza el valor tras el retraso indicado', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'primer valor' }
    });

    rerender({ value: 'actualizado' });

    expect(result.current).toBe('primer valor');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('actualizado');
  });
});
