import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarCuerpo, procesarMensaje, procesarTexto, VERSIONES_SOPORTADAS } from '../src/protocolo.js';

const pedir = (method, params, id = 1) => procesarMensaje({ jsonrpc: '2.0', id, method, params });

test('initialize acepta la versión que pide el cliente si la soporta', () => {
  const r = pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.equal(r.result.protocolVersion, '2025-06-18');
  assert.deepEqual(r.result.capabilities, { tools: { listChanged: false } });
  assert.equal(r.result.serverInfo.name, 'br-revisor');
});

test('initialize ofrece la más nueva si la pedida no está soportada', () => {
  const r = pedir('initialize', { protocolVersion: '1999-01-01' });
  assert.equal(r.result.protocolVersion, VERSIONES_SOPORTADAS[0]);
});

test('ping, tools/list y método desconocido', () => {
  assert.deepEqual(pedir('ping').result, {});
  assert.deepEqual(pedir('tools/list').result.tools.map((t) => t.name), ['revisar_contenido', 'revisar_falacias']);
  assert.equal(pedir('resources/list').error.code, -32601);
});

test('tools/list no expone la función interna', () => {
  for (const t of pedir('tools/list').result.tools) assert.equal('ejecutar' in t, false);
});

test('tools/call: herramienta desconocida es error de protocolo, argumentos malos son isError', () => {
  assert.equal(pedir('tools/call', { name: 'borrar_todo', arguments: {} }).error.code, -32602);
  const malo = pedir('tools/call', { name: 'revisar_falacias', arguments: { texto: 'Hola', modalidad: 'anime' } });
  assert.equal(malo.result.isError, true);
  assert.match(malo.result.content[0].text, /modalidad/);
  const sinTexto = pedir('tools/call', { name: 'revisar_contenido', arguments: {} });
  assert.equal(sinTexto.result.isError, true);
});

test('las notificaciones y respuestas del cliente no se contestan', () => {
  assert.equal(procesarMensaje({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(procesarMensaje({ jsonrpc: '2.0', id: 9, result: {} }), null);
});

test('lotes, JSON inválido y solicitudes mal formadas', () => {
  const lote = procesarCuerpo([
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 'a', method: 'ping' },
  ]);
  assert.deepEqual(lote, [{ jsonrpc: '2.0', id: 'a', result: {} }]);
  assert.equal(procesarCuerpo([{ jsonrpc: '2.0', method: 'notifications/initialized' }]), null);
  assert.equal(procesarCuerpo([]).error.code, -32600);
  assert.equal(procesarTexto('{no es json').error.code, -32700);
  assert.equal(procesarMensaje({ id: 1, method: 'ping' }).error.code, -32600);
});
