import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

test.describe('Flujo crítico: autenticación', () => {
  test.beforeEach(() => {
    console.error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E de autenticación.');
    test.skip(!hasSupabaseEnv, 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E de autenticación.');
  });
  test('el usuario anónimo ve el formulario de acceso', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: /Iniciar sesión/ })).toBeVisible();
  });
});
