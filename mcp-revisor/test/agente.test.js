// revisar_a_fondo con la API de Anthropic simulada: no se gasta nada ni se necesita una key real.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MODELO_AGENTE } from '../src/agente.js';
import { procesarMensaje } from '../src/protocolo.js';
import { generarGuias, SALIDA_GUIAS } from '../scripts/generar-guias.mjs';

const TEXTO = 'Lanza una esfera de energía que no depende del tiempo y viaja a mach 30 contra el rival.';

function apiFalsa(respuesta, status = 200) {
  const pedidos = [];
  const fetch = async (url, init) => {
    pedidos.push({ url: String(url), headers: new Headers(init.headers), cuerpo: JSON.parse(init.body) });
    return new Response(JSON.stringify(respuesta), {
      status,
      headers: { 'content-type': 'application/json', 'request-id': 'req_prueba' },
    });
  };
  return { fetch, pedidos };
}

const mensaje = (contenido, stop_reason = 'end_turn') => ({
  id: 'msg_prueba',
  type: 'message',
  role: 'assistant',
  model: MODELO_AGENTE,
  content: contenido,
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 5 },
});

const llamar = (fetch, argumentos = { texto: TEXTO }) =>
  procesarMensaje(
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'revisar_a_fondo', arguments: argumentos } },
    { apiKey: 'sk-prueba', fetch },
  );

test('el MCP llama al agente y devuelve su veredicto', async () => {
  const { fetch, pedidos } = apiFalsa(mensaje([{ type: 'text', text: '**Veredicto:** pasa con cambios.' }]));
  const r = await llamar(fetch, { texto: TEXTO, modalidad: 'unlimited', tipo: 'habilidad' });
  assert.equal(r.result.isError, undefined);
  assert.equal(r.result.content[0].text, '**Veredicto:** pasa con cambios.');

  assert.equal(pedidos.length, 1);
  const { url, headers, cuerpo } = pedidos[0];
  assert.match(url, /\/v1\/messages/);
  // Según la versión del SDK, la key va en x-api-key o en Authorization: Bearer.
  assert.ok(headers.get('x-api-key') === 'sk-prueba' || headers.get('authorization') === 'Bearer sk-prueba');
  assert.match(headers.get('anthropic-beta'), /server-side-fallback-2026-07-01/);
  assert.equal(cuerpo.model, 'claude-opus-5-5');
  assert.equal(cuerpo.fallbacks, 'default');
  assert.equal(cuerpo.output_config.effort, 'high');
  assert.deepEqual(cuerpo.system[0].cache_control, { type: 'ephemeral' });
  assert.match(cuerpo.system[0].text, /<guia nombre="Battle-rol 4">/);

  const pedido = cuerpo.messages[0].content;
  assert.match(pedido, /Modalidad: unlimited/);
  assert.match(pedido, /Tipo: habilidad/);
  assert.match(pedido, /Auto-nerf temporal/); // le pasa los hallazgos de los patrones
});

test('API key inválida: error claro, sin romper el servidor', async () => {
  const { fetch } = apiFalsa({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401);
  const r = await llamar(fetch);
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /API key/);
});

test('si el agente declina, se avisa como error de la herramienta', async () => {
  const { fetch } = apiFalsa(mensaje([], 'refusal'));
  const r = await llamar(fetch);
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /declinó/);
});

test('argumentos inválidos no llegan a la API', async () => {
  const { fetch, pedidos } = apiFalsa(mensaje([{ type: 'text', text: 'x' }]));
  const r = await llamar(fetch, { texto: 'Hola', modalidad: 'anime' });
  assert.equal(r.result.isError, true);
  assert.equal(pedidos.length, 0);
});

test('src/guias.js está al día con las guías del repo (si falla: npm run build:guias)', async () => {
  assert.equal(await readFile(SALIDA_GUIAS, 'utf8'), await generarGuias());
});
