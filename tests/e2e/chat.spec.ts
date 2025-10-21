import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

test.describe('Flujos de chat', () => {
  //*
  test.beforeEach(() => {
    test.skip(!hasSupabaseEnv, 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E del chat.');
  });
  //*
  test('la lista de salas se renderiza y responde a la búsqueda', async ({ page }) => {
    await page.goto('/');

    const search = page.getByPlaceholder('Buscar salas');
    await expect(search).toBeVisible();

    await search.fill('general');
    await expect(page.getByText('No se encontraron salas.')).toBeVisible();
    await expect(page.getByRole('button', { name: /crear nueva sala/i })).toBeVisible();
  });
  test('la página carga bajo umbral de rendimiento', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const domContentLoaded = Date.now() - start;

    expect(domContentLoaded).toBeLessThan(5_000);
  });

  //TODO: Agregar más pruebas E2E relacionadas con el chat:
  /*
  test('el usuario puede enviar y recibir mensajes en una sala', async ({ page }) => {
    await page.goto('/');
    // Implementar prueba de envío y recepción de mensajes
  });
  test('el usuario puede crear una nueva sala de chat', async ({ page }) => {
    await page.goto('/');
    // Implementar prueba de creación de sala
  });
  test('el usuario puede unirse y salir de una sala de chat', async ({ page }) => {
    await page.goto('/');
    // Implementar prueba de unirse y salir de sala
  });
  test('el usuario puede ver y gestionar miembros de la sala solo si es el que creó la sala', async ({ page }) => {
    await page.goto('/');
    // Implementar prueba de gestión de miembros
  });
  test('el usuario no puede ver ni unirse a salas privadas sin invitación', async ({ page }) => {
    await page.goto('/');
    // Implementar prueba de acceso a salas privadas
  });
  test('el usuario puede enviar invitaciones a otros usuarios a unirse a salas privadas', async ({ page }) => {
    await page.goto('/');
    // Implementar prueba de envío de invitaciones
  });
  /*/

});
