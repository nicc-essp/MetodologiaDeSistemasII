import test from 'node:test';
import assert from 'node:assert/strict';
import { validarFormulario } from '../validations/formulario.validation';
import { consultaFicticia } from './helpers/fixtures';

for (const campo of Object.keys(consultaFicticia)) {
  for (const valor of [undefined, '', ' \t\n', null, 0, false, 1, true, {}, [], ['texto']]) {
    test(`validador: rechaza ${campo} con ${JSON.stringify(valor)}`, () => {
      const entrada = { ...consultaFicticia, [campo]: valor };
      assert.equal(validarFormulario(entrada).ok, false);
      assert.equal(entrada[campo as keyof typeof entrada], valor);
    });
  }
}

for (const raiz of [undefined, null, [], 'texto', 1, true]) {
  test(`validador: raíz inválida ${JSON.stringify(raiz)}`, () => {
    assert.deepEqual(validarFormulario(raiz), { ok: false, message: 'El cuerpo debe ser un objeto JSON' });
  });
}

for (const email of ['sin-arroba', '@dominio', 'local@', 'a@@b', 'a@b@c', ' a@b', 'a@b ', 'a @b', 'a@b\n']) {
  test(`validador: correo inválido ${JSON.stringify(email)}`, () => {
    assert.equal(validarFormulario({ ...consultaFicticia, email }).ok, false);
  });
}

test('validador: conserva texto válido y solo proyecta los siete campos', () => {
  const entrada = { ...consultaFicticia, nombre: '  Nombre ficticio  ', email: 'a@b', id: 999, extra: true };
  const { id: _id, extra: _extra, ...esperado } = entrada;
  assert.deepEqual(validarFormulario(entrada), { ok: true, datos: esperado });
  assert.equal(entrada.extra, true);
});

for (const campo of Object.keys(consultaFicticia)) {
  for (const invalido of ['\u0000', '\uD800', '\uDFFF']) {
    test(`validador: rechaza NUL/sustituto aislado en ${campo}: ${JSON.stringify(invalido)}`, () => {
      assert.deepEqual(validarFormulario({ ...consultaFicticia, [campo]: `texto${invalido}` }), {
        ok: false, message: 'Los campos del formulario contienen caracteres no válidos',
      });
    });
  }
}

test('validador: conserva pares sustitutos válidos, acentos, combinaciones, espacios y saltos', () => {
  const entrada = { ...consultaFicticia, mensaje: '  Prueba 😀 ⚖️ cafe\u0301\nOtra línea\r\n  ', extra: '\uD800' };
  const { extra: _extra, ...datos } = entrada;
  assert.deepEqual(validarFormulario(entrada), { ok: true, datos });
});
