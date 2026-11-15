// Prueba el archivo que se pega en Cloudflare (cloudflare/br-revisor-worker.js), tal cual.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import worker from '../cloudflare/br-revisor-worker.js';
import { construirWorker, SALIDA } from '../scripts/construir-worker.mjs';

const BASE = 'https://br-revisor.ejemplo.workers.dev';
const pedir = (ruta, init) => worker.fetch(new Request(`${BASE}${ruta}`, init));
const post = (cuerpo, encabezados = {}) =>
  pedir('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...encabezados },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });

test('el archivo para Cloudflare está al día con src/ (si falla: npm run build:worker)', async () => {
  assert.equal(await readFile(SALIDA, 'utf8'), await construirWorker());
});

test('el archivo para Cloudflare no importa nada: se puede pegar solo', async () => {
  const codigo = await readFile(SALIDA, 'utf8');
  assert.doesNotMatch(codigo, /^\s*import\s/m);
  assert.doesNotMatch(codigo, /\brequire\(/);
});

test('cliente MCP oficial por Streamable HTTP', async () => {
  const transporte = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
    fetch: (url, init) => worker.fetch(new Request(url, init)),
  });
  const cliente = new Client({ name: 'test-http', version: '1.0.0' });
  await cliente.connect(transporte);
  assert.equal(cliente.getServerVersion().name, 'br-revisor');

  const { tools } = await cliente.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['revisar_contenido', 'revisar_falacias']);

  const r = await cliente.callTool({ name: 'revisar_falacias', arguments: { texto: 'Mi técnica borra todo.' } });
  assert.equal(r.structuredContent.hallazgos[0].regla, 'efecto_absoluto_sin_especificar');

  const c = await cliente.callTool({
    name: 'revisar_contenido',
    arguments: { texto: 'Lanza una esfera que rompe la regeneración del rival.', modalidad: 'unlimited' },
  });
  assert.equal(c.structuredContent.modalidad, 'unlimited');
  await cliente.close();
});

test('HTTP: notificación 202, JSON inválido 400, versión no soportada 400', async () => {
  assert.equal((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202);

  const invalido = await post('{roto');
  assert.equal(invalido.status, 400);
  assert.equal((await invalido.json()).error.code, -32700);

  const version = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'Mcp-Protocol-Version': '1999-01-01' });
  assert.equal(version.status, 400);

  const ok = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'Mcp-Protocol-Version': '2025-06-18' });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { jsonrpc: '2.0', id: 1, result: {} });
});

test('HTTP: GET y DELETE en /mcp dan 405; CORS; portada y 404', async () => {
  assert.equal((await pedir('/mcp', { method: 'GET' })).status, 405);
  assert.equal((await pedir('/mcp', { method: 'DELETE' })).status, 405);

  const opciones = await pedir('/mcp', { method: 'OPTIONS' });
  assert.equal(opciones.status, 204);
  assert.equal(opciones.headers.get('access-control-allow-origin'), '*');

  const portada = await pedir('/', { method: 'GET' });
  assert.equal(portada.status, 200);
  assert.match(await portada.text(), /https:\/\/br-revisor\.ejemplo\.workers\.dev\/mcp/);

  assert.equal((await pedir('/otra', { method: 'POST', body: '{}' })).status, 404);
});

test('HTTP: rechaza cuerpos demasiado grandes', async () => {
  const r = await post({ jsonrpc: '2.0', id: 1, method: 'ping', relleno: 'x'.repeat(300 * 1024) });
  assert.equal(r.status, 413);
});

const ENV = { CLAVE_ACCESO: 'clave-de-prueba-larga', ANTHROPIC_API_KEY: 'sk-prueba' };
const postEn = (ruta, cuerpo, env) =>
  worker.fetch(
    new Request(`${BASE}${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify(cuerpo),
    }),
    env,
  );
const listar = async (ruta, env) =>
  (await (await postEn(ruta, { jsonrpc: '2.0', id: 1, method: 'tools/list' }, env)).json()).result.tools.map((t) => t.name);

test('CLAVE_ACCESO: /mcp deja de responder y el endpoint pasa a /mcp/<clave>', async () => {
  assert.equal((await postEn('/mcp', { jsonrpc: '2.0', id: 1, method: 'ping' }, ENV)).status, 404);
  assert.equal((await postEn('/mcp/otra-clave', { jsonrpc: '2.0', id: 1, method: 'ping' }, ENV)).status, 404);
  assert.deepEqual(await listar('/mcp/clave-de-prueba-larga', ENV), ['revisar_contenido', 'revisar_falacias', 'revisar_a_fondo']);
  const portada = await (await worker.fetch(new Request(`${BASE}/`), ENV)).text();
  assert.doesNotMatch(portada, /clave-de-prueba-larga/);
  assert.match(portada, /Agente \(revisar_a_fondo\): activado/);
});

test('sin CLAVE_ACCESO el agente no se activa aunque haya API key', async () => {
  assert.deepEqual(await listar('/mcp', { ANTHROPIC_API_KEY: 'sk-prueba' }), ['revisar_contenido', 'revisar_falacias']);
});

test('el Worker llama al agente con el fetch del entorno', async () => {
  const original = globalThis.fetch;
  let cuerpoEnviado;
  globalThis.fetch = async (url, init) => {
    cuerpoEnviado = JSON.parse(init.body);
    return new Response(
      JSON.stringify({
        id: 'msg_prueba', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
        content: [{ type: 'text', text: '**Veredicto:** pasa.' }],
        stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  };
  try {
    const r = await postEn(
      '/mcp/clave-de-prueba-larga',
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'revisar_a_fondo', arguments: { texto: 'Bloquea el golpe con ambos brazos.' } } },
      ENV,
    );
    const { result } = await r.json();
    assert.equal(result.content[0].text, '**Veredicto:** pasa.');
    assert.equal(cuerpoEnviado.model, 'claude-opus-5-5');
  } finally {
    globalThis.fetch = original;
  }
});
