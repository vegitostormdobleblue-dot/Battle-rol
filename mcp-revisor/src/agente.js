// Agente revisor: la herramienta revisar_a_fondo. Primero pasa los dos revisores por
// patrones y después le manda a Claude (API de Anthropic) el texto, las guías de BR y
// esos hallazgos, para que entregue un veredicto como lo haría un verificador.
//
// El SDK se importa recién al usarlo: el servidor stdio sin API key no lo necesita.

import { revisarContenido } from './contenido.js';
import { revisarFalacias } from './falacias.js';
import { GUIAS_BR } from './guias.js';

export const MODELO_AGENTE = 'claude-opus-5-5';
const ESFUERZO = 'high';
const MAX_TOKENS = 16000;
// claude.ai corta cada llamada a una herramienta a los 240 s: dejamos margen.
const TIEMPO_LIMITE_MS = 180_000;

const INSTRUCCIONES = `Eres el verificador de textos de un servidor de Battle Rol (BR): rol narrativo en el que dos o más personajes se enfrentan describiendo ataques, defensas y habilidades por escrito.

Recibes un texto de BR, su modalidad, su tipo y los hallazgos de un revisor automático por patrones. Tu trabajo:
1. Lee el texto completo y decide qué hallazgos del revisor automático son reales y cuáles son falsos positivos. Si descartas uno, explica por qué en una frase.
2. Busca lo que los patrones no ven: incoherencias entre el efecto y el mecanismo, conceptos mal usados (física, platonismo, neoplatonismo), escalado injustificado, reglas que cambian a mitad del texto.
3. Aplica las guías del servidor que aparecen abajo. Ellas mandan sobre tu criterio general.
4. Respeta la modalidad: en rol simple no se exige justificación ni límites; en Lore Rol las falacias se permiten y el foco es la coherencia con la historia.
5. No inventes stats ni habilidades del personaje. Lo que dependa de su wiki o de su ficha, márcalo como pendiente de verificar.

Responde en español, con tono neutral y sin faltas de ortografía, en este formato Markdown:

**Veredicto:** pasa / pasa con cambios / no pasa, y una frase con el motivo principal.

**Problemas** (de más a menos grave, citando la frase entre comillas)
1. ...

**Cómo corregirlo:** una propuesta concreta por cada problema, en el mismo orden.

**Pendiente de verificar:** lo que depende de la wiki o la ficha (o "nada").

**Falsos positivos descartados:** cuáles y por qué (o "ninguno").

Guías del servidor:

${GUIAS_BR}`;

function resumirHallazgos(r) {
  if (!r.hallazgos.length) return '  (ninguno)';
  return r.hallazgos
    .map((h) => `  - [${h.severidad}] ${h.nombre}: ${h.explicacion}${h.fragmentos.length ? ` Frase: «${h.fragmentos.join(' / ')}»` : ''}`)
    .join('\n');
}

function mensajeUsuario(texto, modalidad, tipo, falacias, contenido) {
  return `Modalidad: ${modalidad}
Tipo: ${tipo}

Texto a revisar:
<texto>
${texto}
</texto>

Hallazgos del revisor automático de falacias (${falacias.veredicto}):
${resumirHallazgos(falacias)}

Hallazgos del revisor automático de contenido (${contenido.veredicto}):
${resumirHallazgos(contenido)}`;
}

export class ErrorDelAgente extends Error {}

/**
 * @param {{ texto: string, modalidad: string, tipo: string }} entrada
 * @param {{ apiKey: string, fetch?: typeof fetch }} opciones
 * @returns {Promise<string>} el veredicto en Markdown
 */
export async function revisarAFondo({ texto, modalidad, tipo }, { apiKey, fetch }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const cliente = new Anthropic({ apiKey, maxRetries: 1, timeout: TIEMPO_LIMITE_MS, ...(fetch ? { fetch } : {}) });

  const falacias = revisarFalacias(texto, { modalidad });
  const contenido = revisarContenido(texto, { modalidad, tipo });

  let respuesta;
  try {
    respuesta = await cliente.beta.messages.create({
      model: MODELO_AGENTE,
      max_tokens: MAX_TOKENS,
      output_config: { effort: ESFUERZO },
      // Si el modelo declina, la API reintenta con el modelo de respaldo por defecto.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Las instrucciones y las guías no cambian entre revisiones: se cachean.
      system: [{ type: 'text', text: INSTRUCCIONES, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: mensajeUsuario(texto, modalidad, tipo, falacias, contenido) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ErrorDelAgente('La API key de Anthropic no es válida. Revisa el secreto ANTHROPIC_API_KEY.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ErrorDelAgente('La API de Anthropic está limitando los pedidos. Intenta de nuevo en un rato.');
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      throw new ErrorDelAgente('El agente tardó demasiado en responder. Intenta de nuevo o con un texto más corto.');
    }
    if (error instanceof Anthropic.APIError) {
      throw new ErrorDelAgente(`La API de Anthropic devolvió un error (${error.status ?? 'sin estado'}): ${error.message}`);
    }
    throw error;
  }

  if (respuesta.stop_reason === 'refusal') {
    throw new ErrorDelAgente('El agente no pudo revisar este texto (lo declinó por seguridad).');
  }
  const veredicto = respuesta.content
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text)
    .join('\n')
    .trim();
  if (!veredicto) throw new ErrorDelAgente('El agente no devolvió ningún veredicto.');
  if (respuesta.stop_reason === 'max_tokens') {
    return `${veredicto}\n\n_(El veredicto quedó cortado por longitud.)_`;
  }
  return veredicto;
}
