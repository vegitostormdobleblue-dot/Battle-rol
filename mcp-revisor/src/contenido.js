// Revisor de contenido de Battle Rol.
//
// Comprueba lo que piden las guías del repo: estructura Inicio / Núcleo /
// Consecuencia, que se explique el por qué y el cómo, que se diga qué se le
// rompe al rival, límites y el marco (física o filosofía) que sostiene el texto.

import {
  buscar,
  citar,
  contarPalabras,
  dividirOraciones,
  normalizar,
  ordenarPorSeveridad,
  resumir,
  veredicto,
  JUSTIFICACION,
} from './texto.js';

// --- Patrones -------------------------------------------------------------

const VERBO = '(a|an|o|e|en|as|es|ando|iendo|ar|er|ir)';

const INICIO = new RegExp(
  `\\b(lanz|cre|invoc|concentr|manifiest|gener|canaliz|activ|desplieg|despleg|apunt|carg|golpe|dispar|conjur|liber|extiend|levant|condens|emit|proyect|ejecut|acumul|reun|bloque|esquiv|pate|cort|empuj|agarr|salt|corr|atac|absorb|desvi|cubr|interpon|alz)${VERBO}\\b`,
);

const NUCLEO =
  /\b(materia|cuerpo|atom\w*|molecul\w*|celul\w*|cohesion|conciencia|mente|alma|espiritu|tiempo|espacio|espacio-tiempo|conceptos?|conceptual\w*|ideas?|formas? platonicas?|existencia|inexistencia|causalidad|entropia|energia|raiz|ontologic\w*|narrativ\w*|pasivas?|regeneracion|inmortalidad|realidad|leyes? fisicas?|estructura|esencia|participacion|nous|hipostasis|anclajes?|coherencia)\b/;

const CONSECUENCIA =
  /\b(si (no es|no lo|no la|logra|impacta|alcanza|toca|conecta)|de (no ser|lograr)|mand\w* (a|al|hacia|contra)|(sale|salir) volando|derrib\w*|arroj\w*|estrell\w*|impact\w*|provoc\w*|caus\w*|produc\w*|resultado|lo que hace que|haciendo que|termin\w*|qued\w*|desintegr\w*|destroz\w*|pulveriz\w*|reinici\w*|corromp\w*|corrupcion|auto-?destru\w*|colaps\w*|desaparec\w*|deja de existir|borr\w*|anul\w*|destru\w*|elimin\w*|romp\w*|neutraliz\w*|bloque\w*|absorb\w*|desvi\w*|redirig\w*|consecuencia\w*|efecto\w*)/;

const LIMITES = {
  alcance: /\b(alcance|area|radio|rango|dominio|zona|solo (afecta|al objetivo|a un objetivo)|objetivo unico|un solo objetivo)\b/,
  duracion: /\b(duracion|dura|durante|instante|permanente\w*|temporal\w*|turnos?|minutos?|segundos?)\b/,
  requisitos: /\b(requiere\w*|necesita\w*|canaliz\w*|concentracion|costo|coste|gasta\w*|consume\w*|condicion\w*|solo si|siempre que|a cambio de|sacrific\w*)\b/,
  contraindicaciones: /\b(no funciona (contra|si|en)|no afecta a|excepto|salvo|debilidad\w*|limitacion\w*|limites?|contraindicacion\w*|no sirve (contra|si))\b/,
};

const QUE_ROMPE =
  /\b(pasivas?|regeneracion|inmortalidad|anclajes?|raiz|defensas?|estructura\w*|cohesion|molecul\w*|atom\w*|hax\w*|resistencias?|inmunidad\w*|existencia|concepto de|coherencia narrativa|continuidad|formas? platonicas?|idea de|alma|conciencia|cuerpo|nucleo|esencia|participacion|fuente|causalidad|durabilidad|stats?)\b/;

const RIVAL =
  /\b(rival|enemigo|oponente|adversario|contrincante|objetivo|contrario)\b|\b(lo|la|le|los|las) [a-z]+(a|an|e|en)\b/;
const ATAQUE_ENTRANTE = /\b(ataque|golpe|tecnica|habilidad|impacto|hax|proyectil|efecto|dano)\b/;

const MARCOS = {
  'física clásica': /\b(newton\w*|f ?= ?ma|masa|aceleracion|fuerza|energia cinetica|conservacion de (la )?energia|inercia|momento lineal|friccion|presion)\b/,
  'física cuántica': /\b(cuantic\w*|superposicion|entrelazamiento|efecto tunel|incertidumbre|particulas?)\b/,
  relatividad: /\b(relativ\w*|espacio-?tiempo|dilatacion|marco de referencia|curvatura|velocidad de la luz|gravedad|gravitacional\w*)\b/,
  'entropía / termodinámica': /\b(entropia|termodinamic\w*)\b/,
  platonismo: /\b(platon\w*|formas? platonicas?|mundo de las ideas|conceptos?|conceptual\w*|arquetipos?)\b/,
  neoplatonismo: /\b(neoplaton\w*|plotino|nous|hipostasis|emanacion|psyche|hyle)\b/,
  'ontología / metafísica': /\b(ontologi\w*|metafisic\w*|existencia|inexistencia|no-ser|axiom\w*|raiz conceptual|trasciend\w*|transciend\w*)\b/,
  causalidad: /\b(causalidad|causa y efecto|causal\w*)\b/,
  lógica: /\b(logica|silogismo|premisas?|paradoja\w*)\b/,
  teología: /\b(teolog\w*|divin\w*|dios|creador)\b/,
  dualismo: /\b(dualismo|dualidad|luz y oscuridad|ser y no ser)\b/,
};

const UNO_NEOPLATONICO = /\b(el|lo) Uno\b/;
const HIPOSTASIS = /\b(nous|intelecto|alma del mundo|psyche|hyle|materia)\b/;
const ESCALA_CUANTICA = /\b(macroscopic\w*|decoheren\w*|escal\w*|todo (su|mi) cuerpo)\b/;

// --- Ayudantes ------------------------------------------------------------

function nuevo(id, nombre, severidad, explicacion, correccion, fragmentos = []) {
  return { regla: id, nombre, severidad, fragmentos: fragmentos.map((f) => citar(f)), explicacion, correccion };
}

/** Severidad según la modalidad: estricta en argumentativo y unlimited, blanda en simple y lore. */
function sev(modalidad, estricta, blanda = 'sugerencia') {
  return modalidad === 'argumentativo' || modalidad === 'unlimited' ? estricta : blanda;
}

function primera(oraciones, regex) {
  const encontrada = buscar(oraciones, regex)[0];
  return encontrada ? encontrada.oracion.original : undefined;
}

// --- Revisor --------------------------------------------------------------

/**
 * Revisa el contenido de un texto de BR (ataque, defensa o habilidad).
 * @param {string} texto
 * @param {{ modalidad?: 'simple'|'argumentativo'|'unlimited'|'lore', tipo?: 'ataque'|'defensa'|'habilidad' }} [opciones]
 */
export function revisarContenido(texto, { modalidad = 'argumentativo', tipo = 'ataque' } = {}) {
  const norm = normalizar(texto);
  const oraciones = dividirOraciones(texto);
  const palabras = contarPalabras(texto);
  const estricto = modalidad === 'argumentativo' || modalidad === 'unlimited';
  const hallazgos = [];

  // Longitud
  const minimo = modalidad === 'simple' ? 4 : 8;
  if (palabras < minimo) {
    hallazgos.push(
      nuevo('muy_corto', 'Texto demasiado corto', 'grave',
        `Tiene ${palabras} palabra(s): no alcanza para evaluar la acción.`,
        'Escribe al menos qué hace el personaje y qué le pasa al rival.'),
    );
  } else if (estricto && palabras < 40) {
    hallazgos.push(
      nuevo('corto_para_modalidad', 'Corto para la modalidad', 'advertencia',
        `Tiene ${palabras} palabras. En ${modalidad} cuesta cubrir inicio, núcleo, consecuencia y justificación en tan poco.`,
        'Desarrolla el cómo y el por qué del efecto.'),
    );
  }
  if (modalidad === 'simple' && palabras > 120) {
    hallazgos.push(
      nuevo('largo_para_simple', 'Largo para rol simple', 'sugerencia',
        `Tiene ${palabras} palabras. El rol simple es texto corto, directo y de acción.`,
        'Recorta la explicación y deja la acción y su efecto.'),
    );
  }

  // Estructura: Inicio / Núcleo / Consecuencia
  const estructura = {
    inicio: INICIO.test(norm),
    nucleo: NUCLEO.test(norm),
    consecuencia: CONSECUENCIA.test(norm),
  };
  if (!estructura.inicio) {
    hallazgos.push(
      nuevo('falta_inicio', 'No se ve cómo se lanza', modalidad === 'simple' ? 'advertencia' : sev(modalidad, 'advertencia'),
        modalidad === 'simple'
          ? 'No queda clara la acción física: ¿golpea, corre, bloquea, dispara?'
          : 'Falta el Inicio: cómo se lanza o se manifiesta el ataque o la defensa.',
        'Abre con la acción concreta del personaje.'),
    );
  }
  if (!estructura.nucleo && modalidad !== 'simple') {
    hallazgos.push(
      nuevo('falta_nucleo', 'No se ve qué afecta', sev(modalidad, 'advertencia'),
        'Falta el Núcleo: qué afecta realmente (materia, conciencia, tiempo, conceptos, existencia…).',
        'Di sobre qué nivel actúa la técnica.'),
    );
  }
  if (!estructura.consecuencia) {
    hallazgos.push(
      nuevo('falta_consecuencia', 'No se ve la consecuencia', sev(modalidad, 'advertencia'),
        tipo === 'defensa'
          ? 'No queda claro qué le pasa al ataque entrante: ¿se bloquea, se desvía, se anula?'
          : 'Falta la Consecuencia: qué pasa si impacta o si no es detenido.',
        tipo === 'defensa'
          ? 'Cierra diciendo cómo queda neutralizado el ataque.'
          : 'Cierra con el efecto, planteado como condición: "si impacta…".'),
    );
  }

  // Por qué funciona
  // En rol simple no se pide justificación ni límites: es "acción sin mucha explicación".
  const justificaciones = buscar(oraciones, JUSTIFICACION).length;
  if (justificaciones === 0 && palabras >= minimo && modalidad !== 'simple') {
    hallazgos.push(
      nuevo('sin_justificacion', 'No explica por qué funciona',
        estricto ? 'grave' : 'sugerencia',
        'No hay ningún "porque", "ya que", "mediante", "al + verbo"… El texto dice qué pasa, pero no por qué.',
        'Agrega el principio que lo sostiene: una ley física, la lógica interna o un nivel ontológico. Basta una frase.'),
    );
  }

  // Efecto en el rival / contra qué defiende
  if (tipo === 'defensa') {
    if (!ATAQUE_ENTRANTE.test(norm)) {
      hallazgos.push(
        nuevo('defensa_sin_objetivo', 'No dice qué defiende', 'advertencia',
          'Una defensa debe decir contra qué parte del ataque actúa.',
          'Nombra el ataque o el aspecto que neutralizas (su impacto, su hax, su núcleo).'),
      );
    }
  } else {
    if (!RIVAL.test(norm)) {
      hallazgos.push(
        nuevo('sin_efecto_en_rival', 'No menciona al rival', 'sugerencia',
          'No queda explícito cómo afecta al enemigo.',
          'Di qué le pasa al rival: ¿lo atraviesa, lo pulveriza, lo frena?'),
      );
    }
    if (estricto && !QUE_ROMPE.test(norm)) {
      hallazgos.push(
        nuevo('sin_objetivo_especifico', 'No dice qué le rompe', 'advertencia',
          'En argumentativo y unlimited hay que ser específico con lo que se le rompe al rival.',
          'Ejemplos: "anula su pasiva X", "rompe la continuidad narrativa que permite su regeneración".'),
      );
    }
  }

  // Límites
  const limites = Object.fromEntries(Object.entries(LIMITES).map(([k, re]) => [k, re.test(norm)]));
  const conLimites = Object.values(limites).filter(Boolean).length;
  const faltan = Object.keys(limites).filter((k) => !limites[k]);
  if (conLimites === 0 && tipo !== 'defensa' && modalidad !== 'simple') {
    hallazgos.push(
      nuevo('sin_limites', 'Sin límites', sev(modalidad, 'advertencia'),
        'No fija alcance, duración, requisitos ni contraindicaciones.',
        'Agrega al menos uno: el alcance (solo el objetivo, un área, un dominio), la duración o un requisito.'),
    );
  } else if (estricto && conLimites === 1 && tipo !== 'defensa') {
    hallazgos.push(
      nuevo('limites_parciales', 'Límites incompletos', 'sugerencia',
        `Solo se ve un tipo de límite. Faltan: ${faltan.join(', ')}.`,
        'No hacen falta todos, pero los límites claros hacen el ataque más difícil de debunkear.'),
    );
  }

  // Marco teórico
  const marcos = Object.entries(MARCOS).filter(([, re]) => re.test(norm)).map(([nombre]) => nombre);
  if (UNO_NEOPLATONICO.test(texto) && !marcos.includes('neoplatonismo')) marcos.push('neoplatonismo');
  if (estricto && marcos.length === 0) {
    hallazgos.push(
      nuevo('sin_marco', 'Sin marco que lo sostenga', 'advertencia',
        'El BR argumentativo usa física, filosofía, metafísica, lógica o teología para justificar los poderes. No se detecta ninguno.',
        'Apóyate en un principio: causalidad, platonismo, relatividad, entropía, jerarquía conceptos > ideas > materia…'),
    );
  }

  // Neoplatonismo: debe decir qué hipóstasis usa
  if (marcos.includes('neoplatonismo') && !HIPOSTASIS.test(norm) && !UNO_NEOPLATONICO.test(texto)) {
    hallazgos.push(
      nuevo('neoplatonismo_sin_hipostasis', 'Neoplatonismo sin hipóstasis', 'advertencia',
        'Usas neoplatonismo pero no dices desde qué hipóstasis actúas (el Uno, el Nous, el Alma o la Materia).',
        'Define la hipóstasis y a qué nivel del rival apuntas: su Forma (Nous), su participación (Alma) o su manifestación física.',
        [primera(oraciones, MARCOS.neoplatonismo)].filter(Boolean)),
    );
  }

  // Cuántica aplicada a escala humana
  if (marcos.includes('física cuántica') && !ESCALA_CUANTICA.test(norm)) {
    hallazgos.push(
      nuevo('cuantica_sin_escala', 'Cuántica sin escalar', 'sugerencia',
        'La superposición o el efecto túnel se dan en partículas. Si los aplicas al cuerpo entero del personaje, el rival puede debunkearlo por decoherencia.',
        'Explica cómo el efecto escala a nivel macroscópico o qué lo mantiene coherente.',
        [primera(oraciones, MARCOS['física cuántica'])].filter(Boolean)),
    );
  }

  const ordenados = ordenarPorSeveridad(hallazgos);
  const resumen = resumir(ordenados);

  const revisionManual = ['¿El personaje puede hacer esto según su wiki o su ficha (stats, haxs, personalidad)?'];
  if (estricto) {
    revisionManual.push(
      '¿Los conceptos están bien usados? Por ejemplo: ¿el platonismo se aplica a Formas y no a objetos?',
      '¿La jerarquía es coherente (conceptos > ideas > materia)?',
    );
  }
  if (modalidad === 'unlimited') revisionManual.push('¿Sigue siendo coherente con este nivel de poder? El BR unlimited se vuelve incoherente si no se controla.');
  if (modalidad === 'lore') revisionManual.push('¿Es coherente con la historia y la personalidad del personaje?');
  if (modalidad === 'simple') revisionManual.push('¿Se entiende en una sola lectura? El rol simple prioriza la claridad.');

  return {
    revisor: 'contenido',
    modalidad,
    tipo,
    palabras,
    veredicto: veredicto(resumen),
    resumen,
    estructura,
    formula: {
      accion: estructura.inicio,
      como_y_por_que: justificaciones > 0,
      que_rompe: tipo === 'defensa' ? ATAQUE_ENTRANTE.test(norm) : QUE_ROMPE.test(norm),
      efecto: estructura.consecuencia,
      limitacion: conLimites > 0,
    },
    limites,
    marcos_detectados: marcos,
    hallazgos: ordenados,
    revision_manual: revisionManual,
  };
}
