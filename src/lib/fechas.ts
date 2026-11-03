// Textos de fecha y hora en español de Chile: "Mañana · 07:30", "08:20".

export function hora(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// "Hoy", "Mañana", "Pasado mañana" o la fecha corta para días más lejanos.
export function dia(fecha: Date | string, ahora = new Date()): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const inicio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((inicio(d) - inicio(ahora)) / 86400000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === 2) return 'Pasado mañana';
  if (dias === -1) return 'Ayer';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}

export function diaYHora(fecha: Date | string): string {
  return `${dia(fecha)} · ${hora(fecha)}`;
}

export function sumarMinutos(fecha: Date | string, minutos: number): Date {
  return new Date(new Date(fecha).getTime() + minutos * 60000);
}

// Fecha de salida desde "días desde hoy" y "HH:MM". Devuelve null si la hora no es válida.
export function armarSalida(diasDesdeHoy: number, horaTexto: string, ahora = new Date()): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(horaTexto.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + diasDesdeHoy, h, min);
  return d;
}
