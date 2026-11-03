# Comparte tu viaje

App iPhone donde el conductor publica un viaje que ya va a hacer y el costo se reparte entre los inscritos. La spec completa está en [AGENTS.md](AGENTS.md) y la maqueta en [docs/diseno/maqueta-iphone.html](docs/diseno/maqueta-iphone.html).

**Stack:** Expo (React Native) con Expo Router, Supabase (Postgres, auth, funciones), push con Expo, mapas con Apple Maps (`react-native-maps`).

Para correrla en tu iPhone y conectar Supabase, ver [docs/puesta-en-marcha.md](docs/puesta-en-marcha.md).

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/app/` | Pantallas (Expo Router): Viajes, Buscar, Detalle, Inscrito, Viaje en curso, Pago, Publicar, Mis viajes, Perfil, Cuenta de cobro. |
| `src/componentes/` | Botones, tarjetas, escala de precios, paraderos y mapa. |
| `src/datos/` | Contrato de datos con dos implementaciones: Supabase y demo en memoria. |
| `src/lib/` | Precio dinámico, fechas, distancias y RUT, con pruebas. |
| `supabase/migrations/` | Modelo de datos y funciones SQL (inscripción, publicar, ubicación, pagos). |
| `supabase/functions/` | Envío de notificaciones push. |
| `docs/` | Modelo de datos, puesta en marcha y diseño. |
