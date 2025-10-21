import { formatRelativeTime, truncate } from '@/utils';

describe('utils/formatRelativeTime', () => {
  it('devuelve cadena vacía cuando no hay fecha', () => {
    expect(formatRelativeTime(null)).toBe('');
  });

  it('formatea fechas pasadas en español', () => {
    const past = new Date();
    past.setSeconds(past.getSeconds() - 30);

    const result = formatRelativeTime(past.toISOString());
    expect(result).toMatch(/hace/);
  });

  it('formatea fechas futuras', () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 5);

    const result = formatRelativeTime(future.toISOString());
    expect(result).toMatch(/en/);
  });
});

describe('utils/truncate', () => {
  it('no modifica cadenas más cortas que el límite', () => {
    expect(truncate('hola', 10)).toBe('hola');
  });

  it('agrega elipsis cuando supera el límite', () => {
    expect(truncate('abcdefghijkl', 5)).toBe('ab...');
  });
});
