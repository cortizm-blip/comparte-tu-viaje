// Distancias y tiempo estimado de llegada para el viaje en curso.
import type { Coordenada, Paradero, Viaje } from '../datos/tipos';

const VELOCIDAD_CIUDAD_KMH = 25;

// Distancia en metros (haversine), igual que distancia_m en la base.
export function distanciaM(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Minutos estimados a velocidad promedio de ciudad, mínimo 1.
export function minutosHasta(a: Coordenada, b: Coordenada): number {
  return Math.max(1, Math.round(distanciaM(a, b) / 1000 / VELOCIDAD_CIUDAD_KMH * 60));
}

// Región de mapa que encuadra todos los puntos con un margen.
export function regionPara(puntos: Coordenada[]) {
  if (puntos.length === 0) return { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.15, longitudeDelta: 0.15 };
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.02),
  };
}

export type ViajeCercano = { viaje: Viaje; paradero: Paradero; distanciaM: number };

// Viajes con algún paradero a menos de maxM metros del punto, del más cercano al más lejano.
export function viajesCerca(viajes: Viaje[], punto: Coordenada, maxM: number): ViajeCercano[] {
  const cercanos: ViajeCercano[] = [];
  for (const viaje of viajes) {
    let mejor: ViajeCercano | null = null;
    for (const paradero of viaje.paraderos) {
      const d = distanciaM(punto, paradero);
      if (d <= maxM && (!mejor || d < mejor.distanciaM)) mejor = { viaje, paradero, distanciaM: d };
    }
    if (mejor) cercanos.push(mejor);
  }
  return cercanos.sort((a, b) => a.distanciaM - b.distanciaM);
}
