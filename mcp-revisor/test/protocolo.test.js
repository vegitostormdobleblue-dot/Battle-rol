import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarCuerpo, procesarMensaje, procesarTexto, VERSIONES_SOPORTADAS } from '../src/protocolo.js';

const pedir = (method, params, id = 1, contexto) => procesarMensaje({ jsonrpc: '2.0', id, method, params }, contexto);
const nombres = async (contexto) => (await pedir('tools/list', {}, 1, contexto)).result.tools.map((t) => t.name);

test('initialize acepta la versión que pide el cliente si la soporta', async () => {
  const r = await pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.equal(r.result.protocolVersion, '2025-06-18');
  assert.deepEqual(r.result.capabilities, { tools: { listChanged: false } });
  assert.equal(r.result.serverInfo.name, 'br-revisor');
});

test('initialize ofrece la más nueva si la pedida no está soportada', async () => {
  const r = await pedir('initialize', { protocolVersion: '1999-01-01' });
  assert.equal(r.result.protocolVersion, VERSIONES_SOPORTADAS[0]);
});

test('ping y método desconocido', async () => {
  assert.deepEqual((await pedir('ping')).result, {});
  assert.equal((await pedir('resources/list')).error.code, -32601);
});

test('revisar_a_fondo solo aparece con API key', async () => {
  assert.deepEqual(await nombres(), ['revisar_contenido', 'revisar_falacias']);
  assert.deepEqual(await nombres({ apiKey: 'sk-prueba' }), ['revisar_contenido', 'revisar_falacias', 'revisar_a_fondo']);
  const sinClave = await pedir('tools/call', { name: 'revisar_a_fondo', arguments: { texto: 'Hola' } });
  assert.equal(sinClave.error.code, -32602);
});

test('tools/list no expone propiedades internas', async () => {
  for (const t of (await pedir('tools/list', {}, 1, { apiKey: 'sk-prueba' })).result.tools) {
    assert.equal('ejecutar' in t, false);
    assert.equal('requiereAgente' in t, false);
  }
});

test('tools/call: herramienta desconocida es error de protocolo, argumentos malos son isError', async () => {
  assert.equal((await pedir('tools/call', { name: 'borrar_todo', arguments: {} })).error.code, -32602);
  const malo = await pedir('tools/call', { name: 'revisar_falacias', arguments: { texto: 'Hola', modalidad: 'anime' } });
  assert.equal(malo.result.isError, true);
  assert.match(malo.result.content[0].text, /modalidad/);
  const sinTexto = await pedir('tools/call', { name: 'revisar_contenido', arguments: {} });
  assert.equal(sinTexto.result.isError, true);
});

test('las notificaciones y respuestas del cliente no se contestan', async () => {
  assert.equal(await procesarMensaje({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(await procesarMensaje({ jsonrpc: '2.0', id: 9, result: {} }), null);
});

test('lotes, JSON inválido y solicitudes mal formadas', async () => {
  const lote = await procesarCuerpo([
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 'a', method: 'ping' },
  ]);
  assert.deepEqual(lote, [{ jsonrpc: '2.0', id: 'a', result: {} }]);
  assert.equal(await procesarCuerpo([{ jsonrpc: '2.0', method: 'notifications/initialized' }]), null);
  assert.equal((await procesarCuerpo([])).error.code, -32600);
  assert.equal((await procesarTexto('{no es json')).error.code, -32700);
  assert.equal((await procesarMensaje({ id: 1, method: 'ping' })).error.code, -32600);
});
