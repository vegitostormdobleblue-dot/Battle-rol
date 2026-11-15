// Definición de las dos herramientas MCP, compartida por el servidor local (stdio)
// y el Worker de Cloudflare (HTTP). Sin dependencias: corre en Node y en Workers.

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
];

/** Lo que se publica en tools/list (sin la función ejecutar). */
export function listarHerramientas() {
  return HERRAMIENTAS.map(({ ejecutar, ...definicion }) => definicion);
}

export function existeHerramienta(nombre) {
  return HERRAMIENTAS.some((h) => h.name === nombre);
}

/**
 * Ejecuta una herramienta y devuelve el resultado de tools/call. Si los argumentos
 * son inválidos devuelve isError: true, para que el modelo pueda corregirlos y reintentar.
 */
export function llamarHerramienta(nombre, args = {}) {
  const herramienta = HERRAMIENTAS.find((h) => h.name === nombre);
  if (!herramienta) throw new Error(`Herramienta desconocida: ${nombre}`);
  try {
    const { texto, datos } = herramienta.ejecutar(args && typeof args === 'object' ? args : {});
    return { content: [{ type: 'text', text: texto }], structuredContent: datos };
  } catch (error) {
    if (!(error instanceof ArgumentoInvalido)) throw error;
    return { content: [{ type: 'text', text: `Argumentos inválidos: ${error.message}` }], isError: true };
  }
}
