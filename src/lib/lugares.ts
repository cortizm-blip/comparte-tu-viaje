// Búsqueda de lugares por nombre: Apple Maps (módulo nativo) y, si no está, el geocodificador de expo-location.
import * as Location from 'expo-location';
import BusquedaLugares, { type Lugar } from '../../modules/busqueda-lugares';

export type { Lugar };

// Hasta 5 lugares en Santiago que coinciden con el texto; el respaldo solo entiende direcciones.
export async function buscarLugares(texto: string): Promise<Lugar[]> {
  if (BusquedaLugares) return BusquedaLugares.buscarLugares(texto);
  const r = await Location.geocodeAsync(`${texto}, Santiago, Chile`);
  return r.slice(0, 5).map((p) => ({ nombre: texto, direccion: null, lat: p.latitude, lng: p.longitude }));
}
