// Servidor MCP "br-revisor" para Cloudflare Workers (transporte Streamable HTTP, sin estado).
//
// Endpoint: POST https://<tu-worker>.workers.dev/mcp
// Con el secreto CLAVE_ACCESO configurado, el endpoint pasa a ser /mcp/<CLAVE_ACCESO>.
//
// Secretos (Settings > Variables and Secrets en el panel de Cloudflare):
//   CLAVE_ACCESO       protege la URL. Elige una clave larga y difícil de adivinar.
//   ANTHROPIC_API_KEY  habilita revisar_a_fondo (el agente). Solo se usa si también
//                      hay CLAVE_ACCESO, para que nadie más pueda gastar tu crédito.
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

function portada(origen, protegido, conAgente) {
  const ruta = protegido ? `${RUTA_MCP}/<tu CLAVE_ACCESO>` : RUTA_MCP;
  const texto =
    `${INFO_SERVIDOR.title} (${INFO_SERVIDOR.name} ${INFO_SERVIDOR.version})\n\n` +
    'Servidor MCP para revisar contenido y falacias en textos de Battle Rol.\n' +
    `Agrégalo como conector con esta URL: ${origen}${ruta}\n` +
    `Agente (revisar_a_fondo): ${conAgente ? 'activado' : 'desactivado'}\n`;
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const clave = env.CLAVE_ACCESO || '';
    const contexto = { apiKey: clave ? env.ANTHROPIC_API_KEY : undefined };
    const rutaMcp = clave ? `${RUTA_MCP}/${clave}` : RUTA_MCP;

    if (request.method === 'OPTIONS') return sinCuerpo(204);
    if (url.pathname === '/' && request.method === 'GET') {
      return portada(url.origin, Boolean(clave), Boolean(contexto.apiKey));
    }
    if (url.pathname !== rutaMcp && url.pathname !== `${rutaMcp}/`) {
      return json({ error: 'No encontrado. Revisa la URL del conector.' }, 404);
    }

    // Sin estado: no hay stream SSE que abrir con GET ni sesión que cerrar con DELETE.
    if (request.method !== 'POST') return sinCuerpo(405, { Allow: 'POST, OPTIONS' });

    const version = request.headers.get('mcp-protocol-version');
    if (version && !VERSIONES_SOPORTADAS.includes(version)) {
      return json(fallo(null, -32600, `Versión de protocolo no soportada: ${version}`), 400);
    }

    const texto = await request.text();
    if (texto.length > MAX_CARACTERES_CUERPO) return json(fallo(null, -32600, 'Mensaje demasiado grande.'), 413);

    const respuesta = await procesarTexto(texto, contexto);
    if (respuesta === null) return sinCuerpo(202); // solo notificaciones
    return json(respuesta, esErrorDeParseo(respuesta) ? 400 : 200);
  },
};
