# Modelo de datos

Postgres (Supabase). Montos en pesos chilenos como enteros.

| Tabla | Para qué |
|---|---|
| `perfiles` | Usuario de la app, con su token push. |
| `cuentas_cobro` | Datos de transferencia del conductor; se reutilizan entre viajes. |
| `viajes` | Origen, destino, hora, costo total (0 = gratis), cupos, estado. |
| `paraderos` | Paraderos ordenados del viaje (metro o punto fijo) con coordenadas. |
| `inscripciones` | Pasajero en un viaje, con su paradero. Se cancelan, no se borran. |
| `seguidores_viaje` | Quienes miran un viaje, para avisarles cuando baja el precio. |
| `pagos` | Estado del pago fuera de la app: pendiente, informado por el pasajero, confirmado por el conductor. |
| `ubicaciones_conductor` | Última posición del conductor durante el viaje. |
| `cola_notificaciones` | Avisos push por enviar; la `clave` única evita duplicados. |

La vista `viajes_con_precio` entrega inscritos, cupos libres, precio actual y precio con uno más.

## Reglas en la base

- `inscribirse(viaje, paradero)` bloquea el viaje, revisa cupos y encola el aviso de baja de precio para inscritos y seguidores. Así dos personas no pueden tomar el último cupo a la vez.
- `encolar_recordatorios()` encola el aviso de 30 minutos para viajes confirmados. Se programa cada minuto con pg_cron.
- La cuenta de cobro solo la ven el conductor y sus pasajeros inscritos.

## Supuestos (confirmar)

- **Redondeo hacia abajo**: con $10.000 y 3 personas cada una paga $3.333 y el conductor recibe $9.999. Así nunca cobra más que el costo real, que es el posicionamiento legal de reparto de gastos.
- **Máximo 8 cupos** por viaje.
- **Viaje confirmado** lo marca el conductor; el estado inicial es "esperando pasajeros".
- **El cobro** se registra al terminar el viaje, como en el mockup. La tabla `pagos` sirve también si se decide cobrar al inscribirse.
- **"Conductor llegando"** se calculará en la app del conductor (o en una función) comparando su posición con cada paradero; falta definir la distancia, propuesta 1 km o 3 minutos.
