# Puesta en marcha

## 1. Probar en tu iPhone en modo demo (sin backend)

Necesitas Node 22 o más y la app **Expo Go** instalada en el iPhone.

```sh
npm install
npx expo start
```

Escanea el código QR con la cámara del iPhone. Sin archivo `.env` la app corre en **modo demo**: viajes de ejemplo en memoria, botones para simular que se inscribe otra persona y para simular el día del viaje (mapa con el conductor avanzando y pago).

## 1b. Instalar en el iPhone con Xcode (sin Expo Go)

Con el iPhone conectado por cable y tu Apple ID agregado en Xcode → Settings → Accounts:

```sh
npm install
npx expo run:ios --device --configuration Release
```

Con una cuenta de Apple **gratuita** (Personal Team) hay tres límites: la app deja de abrir a los 7 días, no se pueden usar notificaciones push y el identificador `cl.compartetuviaje.app` puede no servir. En ese caso cambia `ios.bundleIdentifier` en `app.json` por uno propio, quita la capacidad Push Notifications del proyecto en `ios/` y compila desde Xcode o con `xcodebuild ... -allowProvisioningUpdates DEVELOPMENT_TEAM=<tu equipo>`. Para push y TestFlight se necesita la cuenta Apple Developer pagada.

## 2. Conectar Supabase (datos reales)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región São Paulo es la más cercana a Chile).
2. En **Authentication → Sign In / Providers**, activa **Allow anonymous sign-ins**. El MVP entra con sesión anónima y el nombre que escribe la persona; el login con teléfono queda para después.
3. Aplica las migraciones en orden desde el SQL Editor, o con la CLI:
   ```sh
   npx supabase link --project-ref <proyecto>
   npx supabase db push
   ```
4. Copia `.env.example` a `.env` y completa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` (Project Settings → API, llave pública/anon).
5. Reinicia `npx expo start`. La app ya no muestra "Modo demo".

## 3. Notificaciones push

1. Despliega la función que envía los avisos:
   ```sh
   npx supabase functions deploy enviar-notificaciones
   ```
2. Activa las extensiones `pg_cron` y `pg_net` y ejecuta `supabase/cron.example.sql` con tus datos. Cada minuto encola los recordatorios de 30 minutos y envía lo pendiente.
3. Para que el iPhone reciba push hace falta un `projectId` de EAS: `npx eas-cli@latest init` (cuenta Expo gratuita). Según la versión de Expo Go puede requerir un *development build* (`npx eas-cli@latest build --profile development --platform ios`), que a su vez pide una cuenta Apple Developer.

Avisos que existen hoy: baja de precio (a inscritos y a quienes siguen el viaje), recordatorio 30 minutos antes (viajes confirmados), conductor llegando (a menos de 1 km del paradero) y viaje cancelado.

## 4. Pruebas

```sh
npm test            # precio, fechas y RUT
npm run typecheck   # TypeScript
# SQL, sobre una base Postgres vacía:
for f in supabase/migrations/*.sql; do psql -d <base> -f $f; done
for f in supabase/tests/*.sql; do psql -d <base> -v ON_ERROR_STOP=1 -f $f; done
```

## Proyecto creado

- Proyecto Supabase `comparte-tu-viaje` (ref `emtbqgbuzwzwagrwpbpm`, región São Paulo), con las migraciones 0001 a 0004, la función `enviar-notificaciones` y el cron cada minuto ya configurados.
- `.env` para este proyecto:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://emtbqgbuzwzwagrwpbpm.supabase.co
  EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_YaHRl7roLMc5DldxGKfL6w_Xj40jny8
  ```
  Es la llave pública (publishable); se puede compartir, la seguridad la dan las políticas por fila.
