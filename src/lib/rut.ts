// Validación de RUT chileno.

// RUT chileno con dígito verificador (módulo 11). Acepta puntos y guion.
export function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  let suma = 0;
  let factor = 2;
  for (let i = limpio.length - 2; i >= 0; i--) {
    suma += Number(limpio[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  return limpio.slice(-1) === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
}
