// Precio dinámico de un viaje: el costo total se reparte entre los inscritos.
// Se redondea hacia abajo para que el conductor nunca cobre más que el costo real (tope legal).
// Debe calzar con la función SQL precio_por_persona en supabase/migrations.

export type EscalonPrecio = { pasajeros: number; precio: number };

// Precio que paga cada pasajero con `inscritos` personas.
// Sin inscritos se muestra el costo total, que es lo que pagaría el primero.
export function precioPorPersona(costoTotal: number, inscritos: number): number {
  if (!Number.isInteger(costoTotal) || costoTotal < 0) throw new Error('costoTotal inválido');
  if (!Number.isInteger(inscritos) || inscritos < 0) throw new Error('inscritos inválido');
  if (costoTotal === 0) return 0;
  return Math.floor(costoTotal / Math.max(inscritos, 1));
}

// Precio si se suma una persona más, o null si ya no quedan cupos o el viaje es gratis.
// Alimenta el texto "baja a $X con 1 más".
export function precioConUnoMas(costoTotal: number, inscritos: number, cupos: number): number | null {
  if (costoTotal === 0 || inscritos + 1 > cupos) return null;
  return precioPorPersona(costoTotal, inscritos + 1);
}

// Escala completa de 1 a `cupos` pasajeros, para el detalle y la vista previa al publicar.
export function escalaDePrecios(costoTotal: number, cupos: number): EscalonPrecio[] {
  if (!Number.isInteger(cupos) || cupos < 1) throw new Error('cupos inválido');
  return Array.from({ length: cupos }, (_, i) => ({
    pasajeros: i + 1,
    precio: precioPorPersona(costoTotal, i + 1),
  }));
}

// Formato de pesos chilenos: 10000 -> "$10.000", 0 -> "Gratis".
// No usa Intl porque Hermes no siempre trae los datos de locale es-CL.
export function formatoCLP(monto: number, gratisComoTexto = true): string {
  if (monto === 0 && gratisComoTexto) return 'Gratis';
  const signo = monto < 0 ? '-' : '';
  const miles = Math.abs(Math.round(monto)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${miles}`;
}
