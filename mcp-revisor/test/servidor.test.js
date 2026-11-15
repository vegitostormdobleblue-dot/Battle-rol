// El servidor stdio probado con el cliente MCP oficial, como lo arrancaría Claude.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function conectar() {
  const transporte = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/server.js', import.meta.url))],
    stderr: 'ignore',
  });
  const cliente = new Client({ name: 'test-stdio', version: '1.0.0' });
  await cliente.connect(transporte);
  return cliente;
}

test('stdio: expone las dos herramientas de solo lectura', async () => {
  const cliente = await conectar();
  assert.equal(cliente.getServerVersion().name, 'br-revisor');
  const { tools } = await cliente.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['revisar_contenido', 'revisar_falacias']);
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.ok(t.outputSchema);
  }
  await cliente.close();
});

test('stdio: los resultados cumplen el outputSchema (el cliente oficial lo valida)', async () => {
  const cliente = await conectar();
  await cliente.listTools(); // carga los outputSchema para que callTool valide la salida
  const falacias = await cliente.callTool({
    name: 'revisar_falacias',
    arguments: { texto: 'Bloqueo el golpe porque soy más fuerte. Tiene poder infinito.' },
  });
  assert.ok(!falacias.isError);
  assert.match(falacias.content[0].text, /Apelación al poder del personaje/);
  assert.equal(falacias.structuredContent.resumen.grave, 1);

  const contenido = await cliente.callTool({
    name: 'revisar_contenido',
    arguments: { texto: 'Bloquea el golpe con ambos brazos.', modalidad: 'simple', tipo: 'defensa' },
  });
  assert.equal(contenido.structuredContent.tipo, 'defensa');
  assert.equal(contenido.structuredContent.modalidad, 'simple');
  await cliente.close();
});

test('stdio: argumentos inválidos vuelven como isError', async () => {
  const cliente = await conectar();
  const vacio = await cliente.callTool({ name: 'revisar_falacias', arguments: { texto: '   ' } });
  assert.equal(vacio.isError, true);
  const mala = await cliente.callTool({ name: 'revisar_falacias', arguments: { texto: 'Hola', modalidad: 'anime' } });
  assert.equal(mala.isError, true);
  await cliente.close();
});
