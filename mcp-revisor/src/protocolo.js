// Protocolo MCP (JSON-RPC 2.0) sin dependencias. Lo usan los dos transportes:
// stdio (src/server.js) y HTTP en Cloudflare Workers (cloudflare/worker.js).
//
// Solo implementa lo que este servidor ofrece: initialize, ping, tools/list y tools/call.

import { existeHerramienta, listarHerramientas, llamarHerramienta } from './herramientas.js';

export const INFO_SERVIDOR = { name: 'br-revisor', title: 'Revisor de Battle Rol', version: '1.1.0' };

/** La primera es la más nueva; es la que se ofrece si el cliente pide una que no está en la lista. */
export const VERSIONES_SOPORTADAS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCCIONES =
  'Servidor con un único propósito: revisar textos de Battle Rol (BR). Usa revisar_contenido para la ' +
  'estructura y la calidad del ataque, la defensa o la habilidad, y revisar_falacias para auto-nerfs y ' +
  'falacias. Pasa siempre la modalidad (simple, argumentativo, unlimited o lore). La revisión es por ' +
  'patrones: completa los puntos de revision_manual con tu criterio antes de dar un veredicto.';

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const exito = (id, result) => ({ jsonrpc: '2.0', id, result });
export const fallo = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

function responder(id, method, params) {
  switch (method) {
    case 'initialize': {
      const pedida = params.protocolVersion;
      return exito(id, {
        protocolVersion: VERSIONES_SOPORTADAS.includes(pedida) ? pedida : VERSIONES_SOPORTADAS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: INFO_SERVIDOR,
        instructions: INSTRUCCIONES,
      });
    }
    case 'ping':
      return exito(id, {});
    case 'tools/list':
      return exito(id, { tools: listarHerramientas() });
    case 'tools/call':
      if (typeof params.name !== 'string') return fallo(id, INVALID_PARAMS, 'tools/call necesita "name".');
      if (!existeHerramienta(params.name)) return fallo(id, INVALID_PARAMS, `Herramienta desconocida: ${params.name}`);
      return exito(id, llamarHerramienta(params.name, params.arguments ?? {}));
    default:
      return fallo(id, METHOD_NOT_FOUND, `Método no soportado: ${method}`);
  }
}

/**
 * Procesa un mensaje JSON-RPC ya parseado. Devuelve la respuesta, o null si no hay que
 * contestar (notificaciones como notifications/initialized, o respuestas del cliente).
 */
export function procesarMensaje(mensaje) {
  if (!mensaje || typeof mensaje !== 'object' || Array.isArray(mensaje) || mensaje.jsonrpc !== '2.0') {
    return fallo(mensaje?.id, INVALID_REQUEST, 'Solicitud JSON-RPC inválida.');
  }
  if (typeof mensaje.method !== 'string') {
    if ('result' in mensaje || 'error' in mensaje) return null;
    return fallo(mensaje.id, INVALID_REQUEST, 'Falta "method".');
  }
  if (!('id' in mensaje)) return null;

  const params = mensaje.params && typeof mensaje.params === 'object' ? mensaje.params : {};
  try {
    return responder(mensaje.id, mensaje.method, params);
  } catch (error) {
    return fallo(mensaje.id, INTERNAL_ERROR, `Error interno: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Procesa un mensaje suelto o un lote (arreglo). Devuelve null si no hay nada que contestar. */
export function procesarCuerpo(cuerpo) {
  if (!Array.isArray(cuerpo)) return procesarMensaje(cuerpo);
  if (cuerpo.length === 0) return fallo(null, INVALID_REQUEST, 'Lote vacío.');
  const respuestas = cuerpo.map(procesarMensaje).filter(Boolean);
  return respuestas.length ? respuestas : null;
}

/** Igual que procesarCuerpo, pero recibe el texto crudo y maneja el JSON inválido. */
export function procesarTexto(texto) {
  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return fallo(null, PARSE_ERROR, 'El cuerpo no es JSON válido.');
  }
  return procesarCuerpo(cuerpo);
}

export const esErrorDeParseo = (respuesta) => !Array.isArray(respuesta) && respuesta?.error?.code === PARSE_ERROR;
