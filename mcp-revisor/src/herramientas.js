// Definición de las herramientas MCP, compartida por el servidor local (stdio) y el
// Worker de Cloudflare (HTTP). Las dos de patrones no tienen dependencias; revisar_a_fondo
// usa el SDK de Anthropic y solo aparece si hay una API key.

import { ErrorDelAgente, revisarAFondo } from './agente.js';
import { revisarContenido } from './contenido.js';
import { revisarFalacias } from './falacias.js';
import { formatearContenido, formatearFalacias } from './formato.js';
import { MODALIDADES } from './texto.js';

const TIPOS = ['ataque', 'defensa', 'habilidad'];
const MAX_CARACTERES = 20000;

// --- JSON Schema ----------------------------------------------------------

const ENTRADA_TEXTO = {
  type: 'string',
  minLength: 1,
  maxLength: MAX_CARACTERES,
  description: 'El texto de BR a revisar, tal como se va a mandar (ataque, defensa, habilidad o debunk).',
};

const ENTRADA_MODALIDAD = {
  type: 'string',
  enum: MODALIDADES,
  default: 'argumentativo',
  description:
    'Modalidad del BR: "simple" (corto y directo), "argumentativo" (filosofía, física o lógica), ' +
    '"unlimited" (sin techo de poder) o "lore" (prioriza la historia; las falacias se permiten).',
};

const ENTRADA_TIPO = {
  type: 'string',
  enum: TIPOS,
  default: 'ataque',
  description: 'Qué es el texto. Las defensas se evalúan contra el ataque que reciben.',
};

const lista = (items) => ({ type: 'array', items });
const booleanos = (...claves) => ({
  type: 'object',
  properties: Object.fromEntries(claves.map((c) => [c, { type: 'boolean' }])),
  required: claves,
});

const HALLAZGO = {
  type: 'object',
  properties: {
    regla: { type: 'string' },
    nombre: { type: 'string' },
    severidad: { type: 'string', enum: ['grave', 'advertencia', 'sugerencia'] },
    fragmentos: lista({ type: 'string' }),
    explicacion: { type: 'string' },
    correccion: { type: 'string' },
    detalle: { type: 'string' },
  },
  required: ['regla', 'nombre', 'severidad', 'fragmentos', 'explicacion', 'correccion'],
};

const SALIDA_COMUN = {
  modalidad: { type: 'string', enum: MODALIDADES },
  veredicto: { type: 'string' },
  resumen: {
    type: 'object',
    properties: { grave: { type: 'number' }, advertencia: { type: 'number' }, sugerencia: { type: 'number' } },
    required: ['grave', 'advertencia', 'sugerencia'],
  },
  hallazgos: lista(HALLAZGO),
  revision_manual: lista({ type: 'string' }),
};
const REQUERIDOS_COMUNES = ['revisor', 'modalidad', 'veredicto', 'resumen', 'hallazgos', 'revision_manual'];

const ANOTACIONES = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// El agente consulta la API de Anthropic y su respuesta puede variar entre llamadas.
const ANOTACIONES_AGENTE = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true };

// --- Validación de argumentos ---------------------------------------------

class ArgumentoInvalido extends Error {}

function leerTexto(args) {
  if (typeof args.texto !== 'string') throw new ArgumentoInvalido('Falta "texto" (debe ser un string).');
  const texto = args.texto.trim();
  if (!texto) throw new ArgumentoInvalido('El texto no puede estar vacío.');
  if (texto.length > MAX_CARACTERES) {
    throw new ArgumentoInvalido(`El texto es demasiado largo (máximo ${MAX_CARACTERES} caracteres).`);
  }
  return texto;
}

function leerOpcion(args, clave, permitidos, porDefecto) {
  const valor = args[clave];
  if (valor === undefined || valor === null) return porDefecto;
  if (!permitidos.includes(valor)) {
    throw new ArgumentoInvalido(`"${clave}" debe ser uno de: ${permitidos.join(', ')}. Llegó: ${JSON.stringify(valor)}.`);
  }
  return valor;
}

// --- Herramientas ---------------------------------------------------------

const HERRAMIENTAS = [
  {
    name: 'revisar_contenido',
    title: 'Revisar contenido de BR',
    description:
      'Revisa un ataque, una defensa o una habilidad de Battle Rol contra las guías del servidor: ' +
      'estructura Inicio / Núcleo / Consecuencia, si explica el cómo y el por qué, qué le rompe al rival, ' +
      'límites (alcance, duración, requisitos, contraindicaciones) y qué marco lo sostiene (física, platonismo, ' +
      'neoplatonismo…). La revisión es por patrones: después completa los puntos de "revision_manual" con tu propio criterio.',
    inputSchema: {
      type: 'object',
      properties: { texto: ENTRADA_TEXTO, modalidad: ENTRADA_MODALIDAD, tipo: ENTRADA_TIPO },
      required: ['texto'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        revisor: { type: 'string', const: 'contenido' },
        ...SALIDA_COMUN,
        tipo: { type: 'string', enum: TIPOS },
        palabras: { type: 'number' },
        estructura: booleanos('inicio', 'nucleo', 'consecuencia'),
        formula: booleanos('accion', 'como_y_por_que', 'que_rompe', 'efecto', 'limitacion'),
        limites: booleanos('alcance', 'duracion', 'requisitos', 'contraindicaciones'),
        marcos_detectados: lista({ type: 'string' }),
      },
      required: [...REQUERIDOS_COMUNES, 'tipo', 'palabras', 'estructura', 'formula', 'limites', 'marcos_detectados'],
    },
    annotations: ANOTACIONES,
    ejecutar(args) {
      const resultado = revisarContenido(leerTexto(args), {
        modalidad: leerOpcion(args, 'modalidad', MODALIDADES, 'argumentativo'),
        tipo: leerOpcion(args, 'tipo', TIPOS, 'ataque'),
      });
      return { texto: formatearContenido(resultado), datos: resultado };
    },
  },
  {
    name: 'revisar_falacias',
    title: 'Revisar falacias de BR',
    description:
      'Busca falacias y auto-nerfs en un texto de Battle Rol: auto-nerf temporal o espacial, contradicción ' +
      'de nivel conceptual, "lo bloquea porque es más fuerte", autohit ("no puede esquivar"), tankeo sin ' +
      'justificar, trascendencia sin mecanismo, "borra todo" sin especificar, razonamiento circular, ' +
      '"infinito" sin definir y FTL sin justificar. En modalidad "lore" todo baja a sugerencia porque ahí ' +
      'las falacias se permiten. La revisión es por patrones: completa los puntos de "revision_manual" con tu propio criterio.',
    inputSchema: {
      type: 'object',
      properties: { texto: ENTRADA_TEXTO, modalidad: ENTRADA_MODALIDAD },
      required: ['texto'],
    },
    outputSchema: {
      type: 'object',
      properties: { revisor: { type: 'string', const: 'falacias' }, ...SALIDA_COMUN },
      required: REQUERIDOS_COMUNES,
    },
    annotations: ANOTACIONES,
    ejecutar(args) {
      const resultado = revisarFalacias(leerTexto(args), {
        modalidad: leerOpcion(args, 'modalidad', MODALIDADES, 'argumentativo'),
      });
      return { texto: formatearFalacias(resultado), datos: resultado };
    },
  },
  {
    name: 'revisar_a_fondo',
    title: 'Revisión a fondo de BR (agente)',
    description:
      'Revisión completa de un texto de Battle Rol hecha por un agente (Claude) que conoce las guías del servidor. ' +
      'Pasa los dos revisores por patrones, descarta sus falsos positivos, busca incoherencias que los patrones no ven ' +
      'y entrega un veredicto (pasa / pasa con cambios / no pasa) con los problemas citados y cómo corregirlos. ' +
      'Tarda hasta un par de minutos y cada llamada tiene costo: úsala cuando el usuario pida una revisión completa ' +
      'o un veredicto, y muestra el resultado tal cual.',
    inputSchema: {
      type: 'object',
      properties: { texto: ENTRADA_TEXTO, modalidad: ENTRADA_MODALIDAD, tipo: ENTRADA_TIPO },
      required: ['texto'],
    },
    annotations: ANOTACIONES_AGENTE,
    requiereAgente: true,
    async ejecutar(args, contexto) {
      const veredicto = await revisarAFondo(
        {
          texto: leerTexto(args),
          modalidad: leerOpcion(args, 'modalidad', MODALIDADES, 'argumentativo'),
          tipo: leerOpcion(args, 'tipo', TIPOS, 'ataque'),
        },
        { apiKey: contexto.apiKey, fetch: contexto.fetch },
      );
      return { texto: veredicto };
    },
  },
];

/** revisar_a_fondo solo existe si el contexto trae una API key de Anthropic. */
function disponibles(contexto = {}) {
  return HERRAMIENTAS.filter((h) => !h.requiereAgente || Boolean(contexto.apiKey));
}

/** Lo que se publica en tools/list (sin las propiedades internas). */
export function listarHerramientas(contexto) {
  return disponibles(contexto).map(({ ejecutar, requiereAgente, ...definicion }) => definicion);
}

export function existeHerramienta(nombre, contexto) {
  return disponibles(contexto).some((h) => h.name === nombre);
}


/**
 * Ejecuta una herramienta y devuelve el resultado de tools/call. Los argumentos inválidos
 * y los errores del agente vuelven con isError: true, para que el modelo avise o reintente.
 */
export async function llamarHerramienta(nombre, args = {}, contexto = {}) {
  const herramienta = disponibles(contexto).find((h) => h.name === nombre);
  if (!herramienta) throw new Error(`Herramienta desconocida: ${nombre}`);
  try {
    const entrada = args && typeof args === 'object' ? args : {};
    const { texto, datos } = await herramienta.ejecutar(entrada, contexto);
    return { content: [{ type: 'text', text: texto }], ...(datos ? { structuredContent: datos } : {}) };
  } catch (error) {
    if (error instanceof ArgumentoInvalido) {
      return { content: [{ type: 'text', text: `Argumentos inválidos: ${error.message}` }], isError: true };
    }
    if (error instanceof ErrorDelAgente) {
      return { content: [{ type: 'text', text: error.message }], isError: true };
    }
    throw error;
  }
}
