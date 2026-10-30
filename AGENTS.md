# Comparte tu viaje

App iPhone de transporte comunitario. El conductor publica un viaje que ya va a hacer y el costo total se reparte entre los pasajeros inscritos. Mientras más se inscriben, menos paga cada uno.

## Reglas de negocio

- El conductor publica 1-2 días antes de salir. No hay compromiso diario ni semanal.
- Precio por persona = costo total / pasajeros inscritos. Ejemplo con $10.000: 1 persona paga $10.000, 2 pagan $5.000, 3 pagan $3.333, 4 pagan $2.500.
- Cada baja de precio notifica a los inscritos y a quienes miran el viaje.
- Hay viajes gratis y pagados, y comunidades cerradas (barrio, universidad, empresa).
- Viaje confirmado: recordatorio a todos 30 min antes de la salida.
- El conductor define los paraderos (estaciones de metro o puntos fijos). La app avisa al pasajero cuando el conductor se acerca a su paradero.
- El pago va directo a la cuenta bancaria del conductor. La plataforma no intermedia dinero. Debe ser rápido.

## MVP

1. Publicar viaje (origen, destino, hora, costo total, cupos, paraderos, cuenta de cobro).
2. Lista de viajes y detalle con precio dinámico.
3. Inscripción a un viaje.
4. Notificaciones push: baja de precio, recordatorio 30 min antes, conductor llegando.
5. Viaje en curso con mapa.
6. Pago: datos bancarios del conductor, copiar y transferir, o link de pago.

Fuera del MVP: calificaciones, comunidades cerradas, pagos integrados, monetización.

## Pantallas (mockup en `docs/diseno/`)

1. Inicio: viajes de la comunidad con precio actual, cupos y "baja a $X con 1 más".
2. Detalle del viaje: precio hoy, escala de precios, paraderos, conductor, botón Inscribirme.
3. Publicar viaje: formulario corto, selector Pagado/Gratis, vista previa de cómo baja el precio.
4. Mis viajes: próximos como pasajero y como conductor, estados (confirmado, esperando pasajeros).
5. Viaje en curso: mapa, tiempo de llegada, línea de paraderos, compartir en vivo.
6. Pago: precio final por persona, datos del conductor, calificación.

Estilo: claro tipo iOS, verde azulado #0B7A6B como color principal, tipografía del sistema, barra de pestañas inferior (Viajes, Publicar, Mis viajes, Perfil), objetivos táctiles de 44 px o más.

## Decisiones abiertas

- Cuándo se cobra: al terminar el viaje (lo asumido en el mockup) o al inscribirse con devolución de la diferencia.
- Qué pasa si el conductor cancela o falla: aviso inmediato y efecto en su reputación.
- Pasajero que no llega: espera máxima y penalización.
- Legal (Chile): posicionar como reparto de gastos con tope al costo real del viaje, sin lucro del conductor. Validar con asesoría legal antes de lanzar.
- Seguridad: verificación de identidad y patente, compartir viaje en vivo.
- Monetización: dejar para después.

## Stack (completar)

- Plataforma: [SwiftUI solo iPhone / React Native con Expo]
- Backend y base de datos: [por definir]
- Notificaciones push: [por definir]
- Mapas: [por definir]
- Pagos: [transferencia con datos copiables / link de pago]

## Convenciones

- Idioma de la interfaz y los textos: español de Chile.
- Moneda: pesos chilenos, formato $10.000.
- Código: comentarios mínimos, un resumen corto al inicio del archivo y 2-4 líneas por rutina.
