import { http, HttpResponse } from 'msw';

/**
 * Default mock handlers used during tests. Individual test suites can
 * override these by calling `server.use(...)` with scenario-specific
 * implementations.
 */
export const handlers = [
  http.get('https://example.com/health', () => HttpResponse.json({ status: 'ok' }))
];
