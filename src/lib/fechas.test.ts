// Pruebas de textos de fecha y armado de la hora de salida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarSalida, dia, hora } from './fechas.ts';

const ahora = new Date(2026, 10, 2, 9, 0);

test('día relativo', () => {
  assert.equal(dia(new Date(2026, 10, 2, 23, 0), ahora), 'Hoy');
  assert.equal(dia(new Date(2026, 10, 3, 7, 30), ahora), 'Mañana');
  assert.equal(dia(new Date(2026, 10, 4, 7, 30), ahora), 'Pasado mañana');
  assert.equal(dia(new Date(2026, 10, 10, 7, 30), ahora), '10 nov');
});

test('hora con dos dígitos', () => {
  assert.equal(hora(new Date(2026, 0, 1, 7, 5)), '07:05');
});

test('armar salida desde día y hora', () => {
  assert.deepEqual(armarSalida(1, '07:45', ahora), new Date(2026, 10, 3, 7, 45));
  assert.deepEqual(armarSalida(0, '7:05', ahora), new Date(2026, 10, 2, 7, 5));
  assert.equal(armarSalida(1, '25:00', ahora), null);
  assert.equal(armarSalida(1, '0745', ahora), null);
});
