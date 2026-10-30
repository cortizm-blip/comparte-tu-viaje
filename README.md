# Comparte tu viaje

App iPhone donde el conductor publica un viaje que ya va a hacer y el costo se reparte entre los inscritos. La spec completa está en [AGENTS.md](AGENTS.md).

## Estado

- `src/lib/precio.ts`: precio dinámico, escala, "baja a $X con 1 más" y formato CLP.
- `supabase/migrations/0001_modelo_inicial.sql`: modelo de datos, inscripción con control de cupos, cola de notificaciones y seguridad por filas.
- `docs/modelo-de-datos.md`: explicación del modelo y supuestos.
- App móvil: pendiente de confirmar stack.

## Pruebas

```sh
npm test                                   # lógica de precio (Node 22+)
psql -d <base> -f supabase/migrations/0001_modelo_inicial.sql
psql -d <base> -v ON_ERROR_STOP=1 -f supabase/tests/modelo.test.sql
```
