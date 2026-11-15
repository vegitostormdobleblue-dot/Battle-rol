// Servidor MCP "br-revisor" para Cloudflare Workers (transporte Streamable HTTP, sin estado).
//
// Endpoint: POST https://<tu-worker>.workers.dev/mcp
//
// Este archivo importa la lógica de ../src. Para pegarlo en el editor del panel de
// Cloudflare usa br-revisor-worker.js, que es todo en un solo archivo
// (se genera con `npm run build:worker`).

import { esErrorDeParseo, fallo, INFO_SERVIDOR, procesarTexto, VERSIONES_SOPORTADAS } from '../src/protocolo.js';

const RUTA_MCP = '/mcp';
const MAX_CARACTERES_CUERPO = 256 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

function json(cuerpo, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function sinCuerpo(status, encabezados = {}) {
  return new Response(null, { status, headers: { ...CORS, ...encabezados } });
}

function portada(origen) {
  const texto =
    `${INFO_SERVIDOR.title} (${INFO_SERVIDOR.name} ${INFO_SERVIDOR.version})\n\n` +
    'Servidor MCP para revisar contenido y falacias en textos de Battle Rol.\n' +
    `Agrégalo como conector con esta URL: ${origen}${RUTA_MCP}\n`;
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return sinCuerpo(204);
    if (url.pathname === '/' && request.method === 'GET') return portada(url.origin);
    if (url.pathname !== RUTA_MCP && url.pathname !== `${RUTA_MCP}/`) {
      return json({ error: `No encontrado. El endpoint MCP es ${RUTA_MCP}.` }, 404);
    }

    // Sin estado: no hay stream SSE que abrir con GET ni sesión que cerrar con DELETE.
    if (request.method !== 'POST') return sinCuerpo(405, { Allow: 'POST, OPTIONS' });

    const version = request.headers.get('mcp-protocol-version');
    if (version && !VERSIONES_SOPORTADAS.includes(version)) {
      return json(fallo(null, -32600, `Versión de protocolo no soportada: ${version}`), 400);
    }

    const texto = await request.text();
    if (texto.length > MAX_CARACTERES_CUERPO) return json(fallo(null, -32600, 'Mensaje demasiado grande.'), 413);

    const respuesta = procesarTexto(texto);
    if (respuesta === null) return sinCuerpo(202); // solo notificaciones
    return json(respuesta, esErrorDeParseo(respuesta) ? 400 : 200);
  },
};
