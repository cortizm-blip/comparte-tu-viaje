// Pruebas de viajes cercanos a un punto buscado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viajesCerca, viajesHacia } from './geo.ts';
import type { Viaje } from '../datos/tipos.ts';

// Viaje mínimo con paraderos en las coordenadas dadas.
function viaje(id: string, puntos: [number, number][]): Viaje {
  return {
    id, conductor: { id: 'c', nombre: 'C', auto: null, patente: null }, origen: 'A', destino: 'B',
    destinoUbicacion: null, saleEn: '2026-11-03T10:00:00Z', costoTotal: 0, cupos: 4, inscritos: 0, estado: 'esperando_pasajeros', notas: null,
    paraderos: puntos.map(([lat, lng], i) => ({ id: `${id}-${i}`, orden: i, nombre: `P${i}`, tipo: 'metro', lat, lng, minutosDesdeSalida: 0 })),
  };
}

const santaIsabel = { lat: -33.4472, lng: -70.6304 };

test('ordena por el paradero más cercano y descarta los lejanos', () => {
  const r = viajesCerca([
    viaje('lejos', [[-33.60, -70.70]]),
    viaje('medio', [[-33.455, -70.630]]),
    viaje('cerca', [[-33.50, -70.60], [-33.4475, -70.6306]]),
  ], santaIsabel, 3000);
  assert.deepEqual(r.map((c) => c.viaje.id), ['cerca', 'medio']);
  assert.equal(r[0].paradero.nombre, 'P1');
  assert.ok(r[0].distanciaM < 100);
});

test('busca por destino ubicado y, si falta, por el último paradero', () => {
  const sanJoaquin = { lat: -33.4985, lng: -70.6140 };
  const conDestino = { ...viaje('destino', [[-33.51, -70.75]]), destinoUbicacion: { lat: -33.4990, lng: -70.6135 } };
  const sinDestino = viaje('ultimo', [[-33.51, -70.75], [-33.4980, -70.6150]]);
  const otroLado = { ...viaje('otro', [[-33.4985, -70.6140]]), destinoUbicacion: { lat: -33.40, lng: -70.55 } };
  const r = viajesHacia([otroLado, sinDestino, conDestino], sanJoaquin, 3000);
  assert.deepEqual(r.map((c) => c.viaje.id).sort(), ['destino', 'ultimo']);
});
