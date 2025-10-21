import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

test.describe('Flujo crítico: autenticación', () => {
  test.beforeEach(() => {
    test.skip(!hasSupabaseEnv, 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E de autenticación.');
  });

  test('el usuario anónimo ve el formulario de acceso', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('el modal móvil puede abrirse y cerrarse', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: /invitado/i }).click();
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();

    await page.getByLabel('Cerrar menú').click();
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).not.toBeVisible({ timeout: 2_000 });
  });
});
