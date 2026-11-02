// Textos de Términos de uso y Política de privacidad que se muestran en la app.
// Resumen fiel de docs/legal/*.md (borradores pendientes de revisión legal); si cambian allá, actualizar aquí.
export type DocumentoLegal = 'terminos' | 'privacidad';

type Seccion = { titulo: string; texto: string };

export const DOCUMENTOS: Record<DocumentoLegal, { titulo: string; secciones: Seccion[] }> = {
  terminos: {
    titulo: 'Términos de uso',
    secciones: [
      { titulo: 'Qué es InTraffic', texto: 'Una app que conecta a personas que manejan con personas que van al mismo destino para compartir el costo del viaje. InTraffic no es una empresa de transporte ni presta el servicio de transporte; no emplea a quienes manejan y no cobra comisión.' },
      { titulo: 'Quién puede usarla', texto: 'Mayores de 18 años. Si manejas, debes tener licencia vigente, el auto con sus papeles y seguro obligatorio al día.' },
      { titulo: 'Reglas para compartir viajes', texto: 'El costo publicado es para cubrir gastos del viaje (bencina, peajes, estacionamiento), no para lucrar. El precio por persona se calcula dividiendo el costo total entre las personas inscritas. El pago se hace directo a quien maneja por transferencia; InTraffic no recibe ni garantiza pagos. Si te inscribes, llega a tu paradero a la hora; si no puedes ir, cancela antes de la salida.' },
      { titulo: 'Contenido y conducta', texto: 'No se permite publicar información falsa, contenido ofensivo, discriminatorio o sexual, acosar a otras personas ni usar la app para fines ilegales. Puedes reportar un viaje o persona y bloquear a quien quieras desde el detalle del viaje. Revisamos los reportes dentro de 24 horas y podemos eliminar contenido o cuentas que no cumplan estas reglas.' },
      { titulo: 'Responsabilidad', texto: 'Cada persona es responsable de su conducta durante el viaje. En caso de emergencia, llama al 133 (Carabineros) o al 131 (SAMU).' },
      { titulo: 'Cuenta', texto: 'Puedes eliminar tu cuenta cuando quieras en Perfil → Eliminar mi cuenta.' },
    ],
  },
  privacidad: {
    titulo: 'Política de privacidad',
    secciones: [
      { titulo: 'Qué datos usamos', texto: 'Tu nombre y, si manejas, el modelo del auto y la patente, que ven las demás personas de la app. Los datos de transferencia de quien maneja (titular, RUT, banco, tipo y número de cuenta, correo y link de pago), que solo ven las personas inscritas en sus viajes. Tus viajes, paraderos, inscripciones y estado de pagos. Tu ubicación mientras usas la app, para el mapa y la búsqueda de lugares; si manejas un viaje en curso, se comparte con sus inscritos hasta que termina. El token de notificaciones del teléfono, que nadie más ve. Los reportes y bloqueos que haces.' },
      { titulo: 'Para qué', texto: 'Para que la app funcione: publicar e inscribirte en viajes, calcular el precio por persona, avisarte y permitir el pago directo entre personas, y para revisar reportes y mantener la seguridad. No usamos tus datos para publicidad, no los vendemos y no te rastreamos entre otras apps o sitios.' },
      { titulo: 'Dónde se guardan', texto: 'En servidores de Supabase en São Paulo, Brasil. Las notificaciones se envían mediante Expo y Apple, y los mapas y la búsqueda de lugares usan Apple Maps.' },
      { titulo: 'Pagos', texto: 'InTraffic no procesa pagos ni guarda dinero. Pagas directamente a quien maneja; la app solo registra si informaste y si se confirmó el pago.' },
      { titulo: 'Cuánto tiempo los guardamos', texto: 'Mientras tengas cuenta. En Perfil → Eliminar mi cuenta se borran al tiro tu perfil, viajes, inscripciones, datos de transferencia y token. Los reportes que otras personas hicieron sobre ti pueden guardarse hasta 12 meses por seguridad.' },
      { titulo: 'Tus derechos', texto: 'Puedes pedir acceso, corrección o eliminación de tus datos conforme a la Ley 19.628 sobre protección de la vida privada.' },
      { titulo: 'Menores de edad', texto: 'La app es para mayores de 18 años.' },
    ],
  },
};
