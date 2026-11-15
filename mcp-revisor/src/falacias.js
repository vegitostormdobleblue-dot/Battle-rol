// Revisor de falacias de Battle Rol.
//
// Cada regla busca un patrón típico de falacia o auto-nerf. La severidad depende
// de la modalidad: en Lore Rol las falacias están permitidas, así que todo baja a
// sugerencia.

import {
  buscar,
  citar,
  dividirOraciones,
  estaJustificada,
  normalizar,
  ordenarPorSeveridad,
  resumir,
  veredicto,
  CAUSA,
} from './texto.js';

const MAX_POR_REGLA = 3;

// --- Patrones -------------------------------------------------------------

const ATEMPORAL =
  /\b(atemporal\w*|no depende del tiempo|independiente del tiempo|fuera del tiempo|(trasciende|transciende) (el|al) tiempo|mas alla del tiempo|no (esta|existe) (sujet[oa] al|en el) tiempo|inmune al tiempo|ajen[oa] al tiempo)/;
const USA_TIEMPO =
  /\b(velocidad\w*|veloz\w*|rapid\w*|aceler\w*|instantane\w*|(mili)?segundos?\b|minutos?\b|horas?\b|mach \d+|ftl\b|en un instante|en menos de|km\/s|m\/s)/;

const AESPACIAL =
  /\b(aespacial\w*|no depende del espacio|independiente del espacio|fuera del espacio|(trasciende|transciende) (el|al) espacio|mas alla del espacio|no ocupa (lugar|espacio)|sin (ubicacion|posicion)|no tiene (ubicacion|posicion))/;
const USA_ESPACIO =
  /\b(se (acerca|aleja|mueve|desplaza)\w*|distancia\w*|(kilo)?metros?\b|(corre|salta|vuela) hacia|se teletransport\w*|coordenada\w*)/;

const SIN_CONCEPTOS =
  /\b(no depende de (los |ningun )?conceptos?|independiente de (los )?conceptos|(trasciende|transciende) (el platonismo|los conceptos|lo conceptual|el nivel conceptual)|mas alla de (los conceptos|lo conceptual|el platonismo))/;
const OPERA_CON_CONCEPTOS =
  /\b(mediante|usando|a traves de|gracias a|por medio de|utilizando|valiendose de|apoyandose en) (el |los |la |las |un |una |su |sus )?(conceptos?|ideas?|formas? platonicas?)\b/;

const INTANGIBLE = /\b(intangib\w*|inmaterial\w*|incorpore\w*|no tiene cuerpo|sin cuerpo fisico)/;
const CONTACTO =
  /\b(golpea|golpeo|toca|toco|agarra|agarro|patea|pateo|empuja|empujo)\b|\bcon (su|mi|el) (puno|mano|manos|pierna|pie|cuerpo|codo|rodilla)\b/;
const VUELVE_TANGIBLE = /\b(se vuelve|vuelve|hace|haciendo) (tangible|material|solid[oa])/;

const AUTORIDAD =
  /\b(porque|ya que|pues|dado que|puesto que|por ser|al ser|debido a que) (es |soy |eres |sigue siendo |simplemente es |simplemente soy )?(mucho |muy |demasiado |el |la |un |una )?(mas fuerte|mas poderos[oa]|fuerte|superior|dios|omnipotente|todopoderos[oa]|invencible|imparable|saitama|goku|absolut[oa]|perfect[oa]|el protagonista)\b/;

const AUTOHIT =
  /\b(no (puede|podra|podria|hay forma de|hay manera de|tiene forma de) (esquivar\w*|defender\w*|bloquear\w*|evitar\w*|escapar\w*|reaccionar\w*|detener\w*|resistir\w*)|imposible de (esquivar|bloquear|evitar|detener|resistir|defender)|inesquivable\w*|imbloqueable\w*|ineludible\w*|inevitable\w*|(impacta|acierta|conecta) (si o si|siempre|sin falta|de todas formas)|garantizad[oa]s?|no falla nunca|nunca falla)/;

const RESULTADO =
  /\b((lo|la|los|las) mata\b|muere (al instante|instantaneamente|sin remedio|en el acto)|queda (muert[oa]|derrotad[oa]|borrad[oa]|eliminad[oa])|pierde la pelea|gano la pelea|fin de la pelea|game over)/;

const NO_SELL =
  /\b(no (me|le|te|nos|les) (afecta\w*|hace (nada|dano|efecto)|dana|toca|llega)|(es|soy|eres|sera) inmune\w*|no recib\w* (ningun )?dano|(sale|queda) ilesa?|ni (me|le) (hace|hizo) (cosquillas|nada|dano)|(me |se )?(lo |la )?tankea\w*)/;

const EFECTO_ABSOLUTO =
  /\b((borra|destruye|anula|elimina|ignora|niega|cancela|aniquila|erradica|rompe|desintegra)\w* (absolutamente todo|todo\b(?! (su|sus|el|la|los|las|tipo)\b)|cualquier cosa|lo que sea)|todo (se borra|desaparece|es borrado|es destruido|se destruye|deja de existir))/;
const ESPECIFICA =
  /(:|\b(incluyendo|incluye|es decir|o sea|especificamente|en concreto|en especifico|como (su|sus|la|las|el|los)|lo que incluye)\b)/;

const TRASCIENDE = /\b(trasciend\w*|transciend\w*|trascendi\w*|transcendi\w*|trascender|transcender|(va|esta|queda) mas alla de)/;

const CAUSAL = /\b(porque|ya que|dado que|puesto que)\b/;

const JUSTIFICACION_VACIA =
  /\b(porque (si|asi es|lo digo|yo lo digo|es asi|puede|puedo|quiero|quiere|se me da la gana|me da la gana)\s*([.,;:!?)]|$)|simplemente (ocurre|pasa|sucede|funciona)\s*([.,;:!?)]|$))/;

const HIPERBOLE = /\b(infinit\w*|omnipoten\w*|omniscien\w*|ilimitad\w*|todopoderos\w*|poder absoluto|absolutamente invencible)/;
const DEFINE = /(:|\b(es decir|o sea|entendido como|en el sentido de|definido como|lo que significa|significa que)\b)/;

const FTL =
  /\b(mas rapido que la luz|ftl\b|supera la velocidad de la luz|velocidad (infinita|superior a la de la luz|superior a la luz)|superlumin\w*)/;

// --- Circularidad -----------------------------------------------------------

const PALABRAS_VACIAS = new Set([
  'puede', 'pueden', 'podria', 'estar', 'tiene', 'tener', 'hacer', 'nadie', 'nada', 'todo', 'todos',
  'cualquier', 'ningun', 'ninguna', 'ninguno', 'cuando', 'donde', 'sobre', 'entre', 'tambien', 'siempre',
  'nunca', 'porque', 'como', 'para', 'mismo', 'misma', 'sigue', 'siendo', 'forma', 'manera', 'ataque',
]);

function raices(fragmento) {
  const palabras = fragmento.split(/[^a-z]+/).filter((p) => p.length >= 5 && !PALABRAS_VACIAS.has(p));
  return palabras.map((p) => {
    const formas = new Set([p.slice(0, 4)]);
    const sinPrefijo = p.replace(/^(des|in|im|ir)/, '');
    if (sinPrefijo.length >= 4) formas.add(sinPrefijo.slice(0, 4));
    return formas;
  });
}

/** "Es indestructible porque no puede ser destruido": la razón repite la afirmación. */
function esCircular(norm) {
  const m = norm.match(CAUSAL);
  if (!m) return false;
  const afirmacion = norm.slice(0, m.index).split(/[,;:]/).pop().split(/\s+/).slice(-8).join(' ');
  const razon = norm.slice(m.index + m[0].length).split(/[,;:.]/)[0];
  const raicesRazon = raices(razon);
  if (raicesRazon.length === 0 || raicesRazon.length > 6) return false;
  const raicesAfirmacion = new Set(raices(afirmacion).flatMap((formas) => [...formas]));
  const repetidas = raicesRazon.filter((formas) => [...formas].some((f) => raicesAfirmacion.has(f)));
  return repetidas.length / raicesRazon.length >= 0.5;
}

// --- Reglas ---------------------------------------------------------------

const REGLAS = [
  {
    id: 'auto_nerf_temporal',
    nombre: 'Auto-nerf temporal',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion:
      'Dices que no dependes del tiempo, pero usas velocidad o duración. Usar velocidad ya te ata a un marco temporal.',
    correccion:
      'Quita la velocidad o la duración, o explica cómo actúa sin tiempo. Por ejemplo: el efecto existe como condición, no como un evento que ocurre "rápido".',
    detectar(ctx) {
      const afirma = buscar(ctx.oraciones, ATEMPORAL);
      const usa = buscar(ctx.oraciones, USA_TIEMPO, { omitirNegadas: true });
      if (!afirma.length || !usa.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, usa[0].oracion.original] }];
    },
  },
  {
    id: 'auto_nerf_espacial',
    nombre: 'Auto-nerf espacial',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion:
      'Dices que no dependes del espacio, pero te mueves, te acercas o mides distancias. Moverse ya te ata a un marco espacial.',
    correccion:
      'Quita el movimiento o la distancia, o explica cómo el ataque llega sin recorrer espacio. Por ejemplo: el efecto se da en el rival sin trayecto.',
    detectar(ctx) {
      const afirma = buscar(ctx.oraciones, AESPACIAL);
      const usa = buscar(ctx.oraciones, USA_ESPACIO, { omitirNegadas: true });
      if (!afirma.length || !usa.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, usa[0].oracion.original] }];
    },
  },
  {
    id: 'contradiccion_conceptual',
    nombre: 'Contradicción de nivel conceptual',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion:
      'Dices que trasciendes los conceptos o el platonismo, pero después actúas mediante un concepto o una idea. Eso te vuelve a hacer dependiente del nivel conceptual.',
    correccion:
      'Si trasciendes lo conceptual, el ataque debe actuar sobre los conceptos desde arriba (rompiéndolos o anulándolos), no a través de ellos.',
    detectar(ctx) {
      const afirma = buscar(ctx.oraciones, SIN_CONCEPTOS);
      const usa = buscar(ctx.oraciones, OPERA_CON_CONCEPTOS, { omitirNegadas: true });
      if (!afirma.length || !usa.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, usa[0].oracion.original] }];
    },
  },
  {
    id: 'intangible_con_contacto',
    nombre: 'Intangible pero golpea',
    severidad: { simple: 'advertencia', argumentativo: 'advertencia', unlimited: 'advertencia' },
    explicacion:
      'El personaje es intangible o inmaterial, pero golpea o toca. Si puede interactuar para golpear, el rival puede usar esa misma interacción para dañarlo.',
    correccion:
      'Explica cómo interactúa siendo intangible. Por ejemplo: solo el punto de impacto se vuelve tangible durante el golpe, y di qué riesgo implica eso.',
    detectar(ctx) {
      if (VUELVE_TANGIBLE.test(ctx.norm)) return [];
      const afirma = buscar(ctx.oraciones, INTANGIBLE, { omitirNegadas: true });
      const contacto = buscar(ctx.oraciones, CONTACTO, { omitirNegadas: true });
      if (!afirma.length || !contacto.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, contacto[0].oracion.original] }];
    },
  },
  {
    id: 'autoridad_del_personaje',
    nombre: 'Apelación al poder del personaje',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion:
      'Justificas el efecto solo con que el personaje es fuerte, superior o un dios. Que sea Saitama o dios no significa que pueda hacer cualquier cosa sin explicar cómo.',
    correccion: 'Cambia "porque es más fuerte" por el mecanismo: qué hace exactamente y por qué eso supera al ataque o a la defensa.',
    detectar(ctx) {
      return buscar(ctx.oraciones, AUTORIDAD)
        .filter(({ oracion, posicion, coincidencia }) => {
          // "superior al nivel conceptual" es un argumento de jerarquía, no de autoridad.
          const despues = oracion.norm.slice(posicion + coincidencia.length);
          return !(coincidencia.endsWith('superior') && /^ (en|al|a)\b/.test(despues));
        })
        .map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    },
  },
  {
    id: 'justificacion_vacia',
    nombre: 'Justificación vacía',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion: '"Porque sí", "porque puede" o "simplemente ocurre" no explica nada. El rival puede contestar lo mismo.',
    correccion: 'Di qué principio o mecanismo hace que funcione: una ley física, la lógica interna del universo o un nivel ontológico.',
    detectar(ctx) {
      return buscar(ctx.oraciones, JUSTIFICACION_VACIA).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    },
  },
  {
    id: 'autohit',
    nombre: 'Autohit / control del rival',
    severidad: { simple: 'grave', argumentativo: 'grave', unlimited: 'grave' },
    explicacion:
      'Decides por el rival que no puede esquivar, bloquear o defenderse. Cómo reacciona lo decide el rival. Tu texto solo puede justificar por qué sería difícil de evitar.',
    correccion:
      'Quita el "no puede esquivar" y explica la propiedad del ataque que lo vuelve difícil de evitar, para que el rival tenga que contestarla.',
    detectar(ctx) {
      return buscar(ctx.oraciones, AUTOHIT, { omitirCondicionales: true }).map(({ oracion }) =>
        CAUSA.test(oracion.norm)
          ? {
              fragmentos: [oracion.original],
              severidad: 'sugerencia',
              detalle:
                'Tiene justificación, pero revisa que no le quite al rival la posibilidad de reaccionar.',
            }
          : { fragmentos: [oracion.original] },
      );
    },
  },
  {
    id: 'resultado_impuesto',
    nombre: 'Resultado impuesto',
    severidad: { simple: 'sugerencia', argumentativo: 'advertencia', unlimited: 'advertencia' },
    explicacion: 'Das por hecho el resultado sobre el rival (lo mata, queda derrotado). La consecuencia se plantea como condición, no como hecho.',
    correccion: 'Escríbelo como condicional: "si impacta…" o "si no es detenido…".',
    detectar(ctx) {
      return buscar(ctx.oraciones, RESULTADO, { omitirCondicionales: true }).map(({ oracion }) => ({
        fragmentos: [oracion.original],
      }));
    },
  },
  {
    id: 'negacion_sin_justificacion',
    nombre: 'Tankeo sin justificación',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion: 'Dices que el ataque no te afecta o que lo tankeas, pero no explicas por qué.',
    correccion: 'Di qué parte del ataque evitas, anulas o superas (su nivel, su núcleo o su mecanismo) y por qué tu personaje puede hacerlo.',
    detectar(ctx) {
      return buscar(ctx.oraciones, NO_SELL)
        .filter(({ oracion }) => !estaJustificada(ctx.oraciones, oracion.indice))
        .map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    },
  },
  {
    id: 'trascendencia_sin_mecanismo',
    nombre: 'Trascendencia sin explicar',
    severidad: { simple: 'advertencia', argumentativo: 'grave', unlimited: 'grave' },
    explicacion: 'Dices que trasciendes algo, pero no explicas cómo ni por qué. Trascender exige decir el por qué y el cómo, aunque sea en una frase.',
    correccion: 'Agrega el mecanismo: qué marco superas y por qué ya no dependes de él. Por ejemplo: "trasciende X porque su existencia ya no depende de Y".',
    detectar(ctx) {
      return buscar(ctx.oraciones, TRASCIENDE, { omitirNegadas: true })
        .filter(({ oracion }) => !estaJustificada(ctx.oraciones, oracion.indice))
        .map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    },
  },
  {
    id: 'efecto_absoluto_sin_especificar',
    nombre: 'Efecto absoluto sin especificar',
    severidad: { simple: 'sugerencia', argumentativo: 'advertencia', unlimited: 'advertencia' },
    explicacion: '"Borra todo" o "destruye cualquier cosa" sin decir qué, exactamente. No se puede evaluar ni contestar.',
    correccion: 'Di qué le rompes exactamente: pasivas, anclajes, coherencia narrativa, raíz de regeneración, etc.',
    detectar(ctx) {
      return buscar(ctx.oraciones, EFECTO_ABSOLUTO)
        .filter(({ oracion }) => !ESPECIFICA.test(oracion.norm))
        .map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    },
  },
  {
    id: 'circularidad',
    nombre: 'Posible razonamiento circular',
    severidad: { simple: 'advertencia', argumentativo: 'advertencia', unlimited: 'advertencia' },
    explicacion: 'La razón repite la afirmación con otras palabras (por ejemplo, "es indestructible porque no puede ser destruido").',
    correccion: 'Cambia la razón por un mecanismo independiente de la afirmación: de dónde sale esa propiedad.',
    detectar(ctx) {
      return ctx.oraciones.filter((o) => esCircular(o.norm)).map((o) => ({ fragmentos: [o.original] }));
    },
  },
  {
    id: 'hiperbole_sin_definir',
    nombre: 'Infinito u omnipotente sin definir',
    severidad: { simple: 'advertencia', argumentativo: 'advertencia', unlimited: 'sugerencia' },
    explicacion: 'Usas "infinito", "omnipotente" o "ilimitado" sin decir en qué sentido. Sin definirlos, el rival puede reducirlos a hipérbole.',
    correccion: 'Define el término: infinito respecto de qué, y omnipotente dentro de qué marco o con qué límites.',
    detectar(ctx) {
      const sinDefinir = buscar(ctx.oraciones, HIPERBOLE).filter(({ oracion }) => !DEFINE.test(oracion.norm));
      if (!sinDefinir.length) return [];
      const veces = sinDefinir.length;
      return [
        {
          fragmentos: [sinDefinir[0].oracion.original],
          detalle: veces > 1 ? `Aparece ${veces} veces sin definir.` : undefined,
        },
      ];
    },
  },
  {
    id: 'ftl_sin_justificacion',
    nombre: 'Velocidad FTL sin justificar',
    severidad: { simple: 'sugerencia', argumentativo: 'advertencia', unlimited: 'advertencia' },
    explicacion: 'Ir más rápido que la luz con masa choca con la relatividad, porque exigiría energía infinita. Sin justificarlo, es fácil de debunkear.',
    correccion: 'Explica cómo evitas el límite. Por ejemplo, curvando el espacio-tiempo en vez de recorrerlo, o con la lógica interna de tu universo.',
    detectar(ctx) {
      return buscar(ctx.oraciones, FTL, { omitirNegadas: true })
        .filter(({ oracion }) => !estaJustificada(ctx.oraciones, oracion.indice))
        .map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    },
  },
];

const REVISION_MANUAL = [
  '¿El personaje tiene ese hax o ese stat según su wiki o su ficha aprobada?',
  'Escalado: ¿se usa una hazaña de un contexto para justificar otro distinto?',
  'Si es un debunk: ¿responde al ataque real del rival o a una versión deformada (hombre de paja)?',
  '¿Lo que se afirma al principio sigue valiendo al final, o cambian las reglas a mitad del texto?',
];

export const REGLAS_DE_FALACIAS = REGLAS.map(({ id, nombre, explicacion }) => ({ id, nombre, explicacion }));

/**
 * Revisa falacias y auto-nerfs en un texto de BR.
 * @param {string} texto
 * @param {{ modalidad?: 'simple'|'argumentativo'|'unlimited'|'lore' }} [opciones]
 */
export function revisarFalacias(texto, { modalidad = 'argumentativo' } = {}) {
  const ctx = { texto, norm: normalizar(texto), oraciones: dividirOraciones(texto), modalidad };
  const hallazgos = [];

  for (const regla of REGLAS) {
    for (const resultado of regla.detectar(ctx).slice(0, MAX_POR_REGLA)) {
      const base = resultado.severidad ?? regla.severidad[modalidad] ?? regla.severidad.argumentativo;
      const severidad = modalidad === 'lore' ? 'sugerencia' : base;
      hallazgos.push({
        regla: regla.id,
        nombre: regla.nombre,
        severidad,
        fragmentos: [...new Set(resultado.fragmentos)].map((f) => citar(f)),
        explicacion: regla.explicacion,
        correccion: regla.correccion,
        ...(resultado.detalle ? { detalle: resultado.detalle } : {}),
      });
    }
  }

  const ordenados = ordenarPorSeveridad(hallazgos);
  const resumen = resumir(ordenados);
  const revisionManual = [...REVISION_MANUAL];
  if (modalidad === 'lore') {
    revisionManual.unshift(
      'En Lore Rol las falacias están permitidas: todo se marcó como sugerencia. Prioriza la coherencia con la historia del personaje.',
    );
  }

  return {
    revisor: 'falacias',
    modalidad,
    veredicto: veredicto(resumen),
    resumen,
    hallazgos: ordenados,
    revision_manual: revisionManual,
  };
}
