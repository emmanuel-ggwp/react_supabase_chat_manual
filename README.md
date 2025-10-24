# React Supabase Chat

Aplicación de chat en tiempo real construida con React, Vite y Supabase. Este repositorio incluye la configuración completa de pruebas (unitarias, de integración y de extremo a extremo), Storybook para documentar componentes y guías de despliegue.

Se utilizo una estructura de estado global con el provider de React ya que la complejidad del proyecto ameritaba algo más que solo que prop drilling, se crearon una serie de hooks para manejar el contexto y para los permisos se uso las políticas RLS en Supabase con PostgreSQL

## Requisitos previos

- Node.js ≥ 18
- npm ≥ 9
- Cuenta de Supabase con un proyecto configurado

## Instalación

```bash
npm install
```

Si es la primera vez que ejecutas las pruebas E2E instala los navegadores de Playwright:

```bash
npm run playwright:install
```

## Variables de entorno

Crea un archivo `.env` (o utiliza `.env.local`) basado en `.env.example`.

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública | `eyJhbGciOi...` |
| `VITE_REDIRECT_URL` | URL base para redirección después de autenticación | `http://localhost:3000` |

Por ahora VITE_REDIRECT_URL no esta funcionando por lo que se tiene que actualizar Site URL en: Authentication > URL Configuration > Site URL

### Recomendaciones por entorno

- **Desarrollo**: usa las claves del proyecto Supabase de desarrollo y habilita `npm run dev`.
- **CI / Testing**: genera un proyecto Supabase aislado o usa la API de Supabase CLI para automatizar semillas.
- **Producción**: utiliza claves gestionadas por tu plataforma (por ejemplo Variables en Vercel) y activa HTTPS.

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Compila TypeScript y genera artefactos Vite |
| `npm run preview` | Sirve la build de producción localmente |
| `npm run lint` | Revisa tipos con TypeScript (sin emitir archivos) |
| `npm run test` | Ejecuta pruebas unitarias e integrales (Jest) |
| `npm run test:unit` | Pruebas unitarias |
| `npm run test:integration` | Pruebas de integración |
| `npm run test:watch` | Modo watch de Jest |
| `npm run test:e2e` | Ejecuta Playwright (requiere build o servidor) |
| `npm run test:e2e:ui` | Ejecuta Playwright en modo UI |
| `npm run storybook` | Levanta Storybook en `http://localhost:6006` |
| `npm run build-storybook` | Genera Storybook estático |

## Pruebas

### Unitarias (Jest + React Testing Library)

- Componentes de UI (`MessageItem`, `RoomList`, etc.).
- Hooks personalizados (`useDebounce`, `useLocalStorage`, `useMessages`).
- Utilidades (`formatRelativeTime`, `truncate`).

Ejecuta:

```bash
npm run test:unit
```

### Integración (Jest)

Pruebas que combinan múltiples capas (contextos + UI) para:

1. Autenticación con `AuthProvider`.
2. Flujo de mensajes (`ChatContainer`).
3. Gestión de salas dentro de `App`.

```bash
npm run test:integration
```

### End-to-End (Playwright)

- Flujos críticos de usuario (autenticación, navegación y búsqueda).
- Validación básica de rendimiento.
- Ejecución cross-browser (Chromium, Firefox y WebKit).

Antes de correr las E2E asegúrate de:

1. Tener una build (`npm run build` + `npm run preview`) o dejar que Playwright arranque el servidor automáticamente.
2. Definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para apuntar al entorno de pruebas.

```bash
npm run test:e2e
```

Puedes omitir el servidor integrado exportando `E2E_SKIP_SERVER=1` si ya tienes la aplicación desplegada en otra URL y definiste `E2E_BASE_URL`.

## Storybook

Documenta los componentes en `src/components` con ejemplos interactivos y estados de error/carga.

```bash
npm run storybook
```

La configuración vive en `.storybook/` y se apoya en los addons Essentials, A11y e Interactions.

## Comentarios y estilo

- Los componentes y hooks clave incluyen JSDoc describiendo su responsabilidad.
- Se preferenció añadir comentarios únicamente donde la lógica no es evidente (por ejemplo, lógica de `useMessages`).

## Despliegue

1. Genera la build: `npm run build`.
2. Sube la carpeta `dist/` a tu CDN/plataforma preferida (Vercel, Netlify, etc.).
3. Configura las variables de entorno para cada entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Si usas Supabase: ejecuta el esquema de `supabase/schema.sql` para mantener la base sincronizada.

## Configuración de pruebas en CI

- Ejecuta `npm ci` para instalaciones reproducibles.
- Usa `npm run lint` y `npm run test` en pipelines rápidos.
- Para E2E `npm run test:e2e`

## Próximos pasos

- Usar Zustand en lugar de el react context, es una dependencia adicional pero por lo que he leido maneja mejor un estado global para una aplicación
- Remover las propiedades de los componentes que son innecesarios Y usar unicamente useChat o useRoom dependiendo del caso

## Bugs

- Al crear una conversacion personal a la contraparte no le aparece la conversacion hasta recargar
- La funcion que mantiene el menuu de iniciar sesion abierto no esta funcionando correctamente en algunos casos (al usar el autocompletado del navegador)