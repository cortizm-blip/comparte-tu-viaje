// Pruebas de la lógica de precio, con los ejemplos de AGENTS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precioPorPersona, precioConUnoMas, escalaDePrecios, formatoCLP } from './precio.ts';

test('reparte $10.000 como en la spec', () => {
  assert.deepEqual([1, 2, 3, 4].map((n) => precioPorPersona(10000, n)), [10000, 5000, 3333, 2500]);
});

test('sin inscritos muestra el costo total', () => {
  assert.equal(precioPorPersona(10000, 0), 10000);
});

test('nunca recauda más que el costo total', () => {
  for (let costo = 1; costo <= 20000; costo += 37) {
    for (let n = 1; n <= 8; n++) assert.ok(precioPorPersona(costo, n) * n <= costo);
  }
});

test('viaje gratis cuesta 0 y no ofrece baja', () => {
  assert.equal(precioPorPersona(0, 3), 0);
  assert.equal(precioConUnoMas(0, 1, 4), null);
});

test('baja con 1 más respeta los cupos', () => {
  assert.equal(precioConUnoMas(10000, 2, 4), 3333);
  assert.equal(precioConUnoMas(10000, 4, 4), null);
});

test('escala de precios', () => {
  assert.deepEqual(escalaDePrecios(10000, 3), [
    { pasajeros: 1, precio: 10000 },
    { pasajeros: 2, precio: 5000 },
    { pasajeros: 3, precio: 3333 },
  ]);
  assert.throws(() => escalaDePrecios(10000, 0));
});

test('rechaza entradas inválidas', () => {
  assert.throws(() => precioPorPersona(-1, 1));
  assert.throws(() => precioPorPersona(100.5, 1));
  assert.throws(() => precioPorPersona(100, -1));
});

test('formato CLP', () => {
  assert.equal(formatoCLP(10000), '$10.000');
  assert.equal(formatoCLP(3333), '$3.333');
  assert.equal(formatoCLP(1250000), '$1.250.000');
  assert.equal(formatoCLP(950), '$950');
  assert.equal(formatoCLP(0), 'Gratis');
  assert.equal(formatoCLP(0, false), '$0');
});
