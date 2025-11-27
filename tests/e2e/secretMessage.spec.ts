import { test, expect } from '@playwright/test';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

test.skip(!hasSupabaseEnv, 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E de mensajes secretos.');

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'l.marcano.234@gmail.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? '25723877Edmz';

test.describe('Mensajes Secretos', () => {
  test('debería enviar y ver un mensaje secreto', async ({ browser }) => {
    // Create two contexts for two users
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // --- User A (Sender) ---
    await pageA.goto('/');
    
    // Login User A
    await pageA.getByTestId('login-email-desktop').fill(TEST_EMAIL);
    await pageA.getByTestId('login-password-desktop').fill(TEST_PASSWORD);
    await pageA.getByTestId('login-password-desktop').press('Enter');
    
    // Wait for room list and join "Sala General"
    await pageA.waitForSelector('[data-testid^="room-item-"]', { timeout: 15000 });
    await pageA.getByTestId('room-item-Sala General').first().click();

    // Handle join button if present
    const joinButtonA = pageA.getByRole('button', { name: /unirme a la sala/i });
    if (await joinButtonA.isVisible()) {
      await joinButtonA.click();
    }
    await pageA.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // --- User A Sends Secret Message ---
    const secretContent = `Secreto ${Date.now()}`;
    
    // Toggle secret mode
    await pageA.getByTestId('secret-message-button').click();
    
    // Type and send
    await pageA.getByTestId('message-input').fill(secretContent);
    await pageA.getByTestId('send-button').click();

    // Verify User A sees "Mensaje oculto enviado"
    await expect(pageA.locator('text=Mensaje oculto enviado').first()).toBeVisible();
  });
});
