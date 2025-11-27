import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const hasSupabaseEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

test.skip(!hasSupabaseEnv, 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para ejecutar E2E de autodestrucción.');

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'l.marcano.234@gmail.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? '25723877Edmz';
const TEST_ROOM_NAME = process.env.E2E_TEST_ROOM ?? 'Sala General';

let skipReason: string | null = null;

const supabase = hasSupabaseEnv
  ? createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false }
    })
  : null;

async function ensureTestData() {
  if (!supabase) {
    skipReason = 'Cliente de Supabase no disponible.';
    return;
  }

  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (signInError || !authData.user) {
    skipReason = `No se pudo iniciar sesión con las credenciales de prueba: ${signInError?.message ?? 'usuario desconocido'}`;
    return;
  }
  const userId = authData.user.id;

  const { data: rooms, error: roomLookupError } = await supabase
    .from('rooms')
    .select('id, created_by')
    .eq('name', TEST_ROOM_NAME)
    .order('created_at', { ascending: true });

  if (roomLookupError) {
    skipReason = `No se pudo consultar la sala '${TEST_ROOM_NAME}': ${roomLookupError.message}`;
    return;
  }

  const roomId = rooms?.[0]?.id ?? null;

  if (!roomId) {
    const { data: createData, error: createError } = await supabase
      .from('rooms')
      .insert({
        name: TEST_ROOM_NAME,
        description: 'Sala generada automáticamente para pruebas E2E',
        is_public: true,
        is_direct: false,
        created_by: userId
      })
      .select('id')
      .single();

    if (createError || !createData) {
      skipReason = `No se pudo crear la sala '${TEST_ROOM_NAME}': ${createError?.message ?? 'respuesta vacía'}`;
      return;
    }

    const createdRoomId = createData.id;

    const { error: membershipError } = await supabase
      .from('room_members')
      .upsert(
        { room_id: createdRoomId, user_id: userId, role: 'owner' },
        { onConflict: 'room_id,user_id' }
      );

    if (membershipError) {
      skipReason = `No se pudo registrar la membresía de prueba: ${membershipError.message}`;
    }

    await supabase.auth.signOut();
    return;
  }
  const duplicateRoomIds = rooms?.slice(1).filter((room) => room.created_by === userId).map((room) => room.id) ?? [];

  if (duplicateRoomIds.length) {
    const { error: cleanupError } = await supabase
      .from('rooms')
      .delete()
      .in('id', duplicateRoomIds);

    if (cleanupError) {
      console.warn('[Autodestrucción E2E] No se pudo limpiar salas duplicadas:', cleanupError.message);
    }
  }

  const { error: membershipError } = await supabase
    .from('room_members')
    .upsert(
      { room_id: roomId, user_id: userId, role: 'owner' },
      { onConflict: 'room_id,user_id' }
    );

  if (membershipError) {
    skipReason = `No se pudo registrar la membresía de prueba: ${membershipError.message}`;
    console.error('[Autodestrucción E2E] ensureTestData -> fallo membresía existente:', membershipError.message);
  }

  await supabase.auth.signOut();
}

test.beforeAll(async () => {
  await ensureTestData();
});

test.describe('Autodestrucción de Mensajes', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (skipReason) {
      console.warn('[Autodestrucción E2E] Se omite el test:', skipReason);
      testInfo.skip(true, skipReason);
    }

    // Login y navegación a una sala de chat
    await page.goto('/');
    
    // Abrir menú de perfil
    await page.getByTestId('profile-dropdown-trigger').click();
    await page.waitForTimeout(500); // Esperar animación del menú

    // Asumimos que hay un flujo de login o bypass para tests
    await page.getByTestId('login-email-desktop').fill(TEST_EMAIL);
    const passwordField = page.getByTestId('login-password-desktop');
    await passwordField.fill(TEST_PASSWORD);
    await passwordField.press('Enter');
    
    // Esperar a que cargue la lista de salas
    await page.waitForSelector('[data-testid^="room-item-"]', { timeout: 10000 });
    await page.getByTestId('room-item-Sala General').first().click();

    const joinButton = page.getByRole('button', { name: /unirme a la sala/i });
    if (await joinButton.isVisible()) {
      await joinButton.click();
    }

    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });
  });

  test('debería enviar un mensaje que desaparece después de 10 segundos', async ({ page }) => {
    const messageContent = `Mensaje fugaz ${Date.now()}`;

    // 1. Escribir mensaje
    await page.getByTestId('message-input').fill(messageContent);

    // 2. Activar timer de 10s
    await page.getByTestId('timer-button').click();
    await page.getByTestId('timer-option-10').click();

    // 3. Enviar
    await page.getByTestId('send-button').click();

    // 4. Verificar que aparece inmediatamente
    await expect(page.getByText(messageContent)).toBeVisible();

    // 5. Esperar 11 segundos (10s expiración + 1s margen)
    // Nota: En tests reales, a veces es mejor mockear el tiempo, pero para E2E visual esperamos.
    await page.waitForTimeout(16000);

    // 6. Verificar que desapareció
    await expect(page.getByText(messageContent)).not.toBeVisible();
  });

  test.only('mensaje expirado no debería aparecer al recargar', async ({ page }) => {
    const messageContent = `Mensaje recarga ${Date.now()}`;

    // 1. Enviar mensaje con 10s
    await page.getByTestId('message-input').fill(messageContent);
    await page.getByTestId('timer-button').click();
    await page.getByTestId('timer-option-10').click();
    await page.getByTestId('send-button').click();

    // 2. Esperar a que expire
    await page.waitForTimeout(16000);
    await expect(page.getByText(messageContent)).not.toBeVisible();

    // 3. Recargar página
    await page.reload();

    // 4. Verificar que sigue sin aparecer (filtrado por servidor/inicialización)
    await expect(page.getByText(messageContent)).not.toBeVisible();
  });
});
