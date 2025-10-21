import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

test.describe('Flujos de chat', () => {
  test.beforeEach(() => {
    test.skip(!hasSupabaseEnv, 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E del chat.');
  });

  test('la lista de salas se renderiza y responde a la búsqueda', async ({ page }) => {
    await page.goto('/');

    const search = page.getByPlaceholder('Buscar salas');
    await expect(search).toBeVisible();

    await search.fill('general');
    await expect(page.getByRole('button', { name: /crear sala/i })).toBeVisible();
  });

  test('la página carga bajo umbral de rendimiento', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const domContentLoaded = Date.now() - start;

    expect(domContentLoaded).toBeLessThan(5_000);
  });
});
