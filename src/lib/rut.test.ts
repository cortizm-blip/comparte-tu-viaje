// Pruebas de validación de RUT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rutValido } from './rut.ts';

test('acepta RUT válidos con y sin formato', () => {
  assert.ok(rutValido('11.111.111-1'));
  assert.ok(rutValido('12.345.678-5'));
  assert.ok(rutValido('7654321-6'));
  assert.ok(rutValido('10.000.013-k'));
});

test('rechaza dígito verificador incorrecto o formato raro', () => {
  assert.ok(!rutValido('12.345.678-9'));
  assert.ok(!rutValido('abc'));
  assert.ok(!rutValido(''));
});
