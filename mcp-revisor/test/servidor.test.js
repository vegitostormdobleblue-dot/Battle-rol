import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { crearServidor } from '../src/server.js';

async function clienteEnMemoria() {
  const [lado, otroLado] = InMemoryTransport.createLinkedPair();
  await crearServidor().connect(lado);
  const cliente = new Client({ name: 'test', version: '1.0.0' });
  await cliente.connect(otroLado);
  return cliente;
}

test('expone exactamente las dos herramientas, de solo lectura', async () => {
  const cliente = await clienteEnMemoria();
  const { tools } = await cliente.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['revisar_contenido', 'revisar_falacias']);
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.ok(t.outputSchema);
  }
  await cliente.close();
});

test('revisar_falacias devuelve informe Markdown y datos estructurados', async () => {
  const cliente = await clienteEnMemoria();
  const r = await cliente.callTool({
    name: 'revisar_falacias',
    arguments: { texto: 'Bloqueo el golpe porque soy más fuerte.' },
  });
  assert.ok(!r.isError);
  assert.match(r.content[0].text, /Apelación al poder del personaje/);
  assert.equal(r.structuredContent.modalidad, 'argumentativo');
  assert.equal(r.structuredContent.resumen.grave, 1);
  await cliente.close();
});

test('revisar_contenido acepta modalidad y tipo', async () => {
  const cliente = await clienteEnMemoria();
  const r = await cliente.callTool({
    name: 'revisar_contenido',
    arguments: { texto: 'Bloquea el golpe con ambos brazos.', modalidad: 'simple', tipo: 'defensa' },
  });
  assert.ok(!r.isError);
  assert.equal(r.structuredContent.tipo, 'defensa');
  assert.equal(r.structuredContent.modalidad, 'simple');
  await cliente.close();
});

test('rechaza texto vacío y modalidad inválida', async () => {
  const cliente = await clienteEnMemoria();
  const vacio = await cliente.callTool({ name: 'revisar_falacias', arguments: { texto: '   ' } });
  assert.equal(vacio.isError, true);
  const mala = await cliente.callTool({ name: 'revisar_falacias', arguments: { texto: 'Hola', modalidad: 'anime' } });
  assert.equal(mala.isError, true);
  await cliente.close();
});

test('arranca por stdio como lo haría Claude', async () => {
  const transporte = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/server.js', import.meta.url))],
    stderr: 'ignore',
  });
  const cliente = new Client({ name: 'test-stdio', version: '1.0.0' });
  await cliente.connect(transporte);
  const { tools } = await cliente.listTools();
  assert.equal(tools.length, 2);
  const r = await cliente.callTool({ name: 'revisar_falacias', arguments: { texto: 'Mi técnica borra todo.' } });
  assert.equal(r.structuredContent.hallazgos[0].regla, 'efecto_absoluto_sin_especificar');
  await cliente.close();
});
