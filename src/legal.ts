// Textos de Términos de uso y Política de privacidad que se muestran en la app.
// Borrador basado en lo que la app hace hoy; debe revisarlo asesoría legal antes de publicar.
export type DocumentoLegal = 'terminos' | 'privacidad';

type Seccion = { titulo: string; texto: string };

export const DOCUMENTOS: Record<DocumentoLegal, { titulo: string; secciones: Seccion[] }> = {
  terminos: {
    titulo: 'Términos de uso',
    secciones: [
      { titulo: 'Qué es InTraffic', texto: 'InTraffic conecta a personas que ya van a hacer un viaje en auto con otras que quieren sumarse y repartir el costo. InTraffic no presta servicios de transporte ni es parte del acuerdo entre conductor y pasajeros.' },
      { titulo: 'Reparto de gastos', texto: 'El conductor publica el costo total real del viaje (bencina y peajes) y ese monto se divide entre los inscritos. No se permite cobrar más que el costo real ni usar la app con fines de lucro.' },
      { titulo: 'Pagos', texto: 'Los pagos se hacen directamente entre pasajero y conductor, por transferencia o link de pago del conductor. InTraffic no recibe ni retiene dinero y no responde por pagos entre usuarios.' },
      { titulo: 'Conducta', texto: 'Está prohibido publicar contenido ofensivo, falso o engañoso, acosar a otras personas o poner en riesgo su seguridad. Puedes reportar viajes y personas y bloquear a quien no quieras ver. Revisamos los reportes y podemos eliminar contenido o cuentas que no cumplan estas reglas.' },
      { titulo: 'Seguridad', texto: 'Cada persona es responsable de verificar con quién viaja. Ante una emergencia, llama al 133 (Carabineros).' },
      { titulo: 'Tu cuenta', texto: 'Puedes eliminar tu cuenta cuando quieras desde Perfil. Al hacerlo se borran tu perfil, tus viajes, inscripciones y datos asociados.' },
    ],
  },
  privacidad: {
    titulo: 'Política de privacidad',
    secciones: [
      { titulo: 'Datos que usamos', texto: 'Tu nombre y, si conduces, tu auto y patente. Si publicas viajes pagados, tu cuenta de cobro (titular, RUT, banco, número de cuenta y, si los agregas, correo y link de pago). Los viajes que publicas, tus inscripciones y el estado de tus pagos. Tu ubicación solo mientras tienes abierta la pantalla del viaje en curso como conductor, y en los mapas si das permiso. El identificador de notificaciones del teléfono, si las permites. Los reportes y bloqueos que haces.' },
      { titulo: 'Para qué', texto: 'Solo para que la app funcione: mostrar y publicar viajes, calcular el precio por persona, avisarte cuando baja el precio o se acerca el conductor y permitir el pago directo al conductor. No vendemos tus datos, no mostramos publicidad y no te rastreamos entre otras apps.' },
      { titulo: 'Quién ve qué', texto: 'Tu nombre, auto y patente los ven las personas que usan la app. Tu cuenta de cobro solo la ven quienes se inscriben en tus viajes pagados. Tu ubicación como conductor solo la ven los pasajeros de ese viaje.' },
      { titulo: 'Dónde se guardan', texto: 'En servidores de Supabase. Los mapas y la búsqueda de lugares usan Apple Maps y las notificaciones se envían con el servicio de Expo.' },
      { titulo: 'Eliminar tus datos', texto: 'Desde Perfil → Eliminar mi cuenta borras tu cuenta y tus datos. No guardamos copias después de eso, salvo lo que exija la ley.' },
    ],
  },
};
