#!/usr/bin/env node
// Servidor MCP "br-revisor" por stdio, para Claude Code y Claude Desktop.
// Un mensaje JSON-RPC por línea: entra por stdin y la respuesta sale por stdout.
// La versión para Cloudflare está en cloudflare/worker.js y usa el mismo protocolo.

import { createInterface } from 'node:readline';
import { procesarTexto } from './protocolo.js';

const lineas = createInterface({ input: process.stdin, crlfDelay: Infinity });

// Con ANTHROPIC_API_KEY en el entorno se habilita revisar_a_fondo (el agente).
const contexto = { apiKey: process.env.ANTHROPIC_API_KEY };

lineas.on('line', async (linea) => {
  if (!linea.trim()) return;
  const respuesta = await procesarTexto(linea, contexto);
  if (respuesta) process.stdout.write(`${JSON.stringify(respuesta)}\n`);
});

// Cuando Claude cierra stdin no queda nada pendiente y el proceso termina solo.
// stdout es del protocolo: los mensajes para humanos van a stderr.
console.error('br-revisor listo (stdio).');
