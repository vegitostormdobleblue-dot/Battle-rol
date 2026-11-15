// br-revisor: servidor MCP para revisar contenido y falacias de Battle Rol.
// ARCHIVO GENERADO con `npm run build:worker`: no lo edites a mano, edita src/ y cloudflare/worker.js.
//
// Cómo usarlo: en Cloudflare, Workers & Pages > Create > Worker > Edit code,
// reemplaza todo el contenido por este archivo y pulsa Deploy.
// El endpoint MCP queda en https://<tu-worker>.workers.dev/mcp


// src/texto.js
function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
function dividirOraciones(texto) {
  return texto.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean).map((original, indice) => ({ indice, original, norm: normalizar(original) }));
}
function citar(oracion, max = 160) {
  const limpio = oracion.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}\u2026` : limpio;
}
function contarPalabras(texto) {
  return (texto.match(/\S+/g) || []).length;
}
var NEGACION = /\b(no|sin|ni|nunca|jamas|tampoco)\b/;
var CORTE_DE_CLAUSULA = /[,;:]|\b(y|pero|aunque|sino)\b/g;
function previoEnClausula(norm, inicio, ventana) {
  const previo = norm.slice(Math.max(0, inicio - ventana), inicio);
  let corte = 0;
  for (const m of previo.matchAll(CORTE_DE_CLAUSULA)) corte = m.index + m[0].length;
  return previo.slice(corte);
}
function estaNegado(norm, inicio, ventana = 25) {
  return NEGACION.test(previoEnClausula(norm, inicio, ventana));
}
function esCondicional(norm, inicio, ventana = 40) {
  return /\b(si|en caso de que|de no)\b/.test(previoEnClausula(norm, inicio, ventana));
}
var CAUSA = /\b(porque|ya que|debido a|dado que|puesto que|pues|mediante|a traves de|gracias a|por medio de|lo que (le |me |te )?permite|(ya no|no) depende|al [a-z]+(ar|er|ir)(se|lo|la|le|los|las)?)\b/;
var JUSTIFICACION = new RegExp(`${CAUSA.source}|\\bpor lo (tanto|que)\\b`);
var JUSTIFICA_LO_ANTERIOR = /^(esto|eso|lo anterior|ya que|porque|debido|dado que|puesto que|la razon|se debe|funciona porque)\b/;
function estaJustificada(oraciones, indice) {
  if (CAUSA.test(oraciones[indice].norm)) return true;
  const siguiente = oraciones[indice + 1];
  return Boolean(siguiente && JUSTIFICA_LO_ANTERIOR.test(siguiente.norm));
}
function buscar(oraciones, regex, { omitirNegadas = false, omitirCondicionales = false } = {}) {
  const global = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  const resultado = [];
  for (const oracion of oraciones) {
    for (const m of oracion.norm.matchAll(global)) {
      if (omitirNegadas && estaNegado(oracion.norm, m.index)) continue;
      if (omitirCondicionales && esCondicional(oracion.norm, m.index)) continue;
      resultado.push({ oracion, coincidencia: m[0], posicion: m.index, match: m });
    }
  }
  return resultado;
}
var MODALIDADES = ["simple", "argumentativo", "unlimited", "lore"];
var NOMBRE_MODALIDAD = {
  simple: "Rol simple",
  argumentativo: "BR argumentativo",
  unlimited: "BR unlimited",
  lore: "Lore Rol"
};
function resumir(hallazgos) {
  const resumen = { grave: 0, advertencia: 0, sugerencia: 0 };
  for (const h of hallazgos) resumen[h.severidad] += 1;
  return resumen;
}
function veredicto(resumen) {
  if (resumen.grave > 0) return "Necesita correcciones";
  if (resumen.advertencia > 0) return "Revisable: corrige las advertencias";
  return "Bien encaminado";
}
var ORDEN_SEVERIDAD = { grave: 0, advertencia: 1, sugerencia: 2 };
function ordenarPorSeveridad(hallazgos) {
  return [...hallazgos].sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);
}

// src/contenido.js
var VERBO = "(a|an|o|e|en|as|es|ando|iendo|ar|er|ir)";
var INICIO = new RegExp(
  `\\b(lanz|cre|invoc|concentr|manifiest|gener|canaliz|activ|desplieg|despleg|apunt|carg|golpe|dispar|conjur|liber|extiend|levant|condens|emit|proyect|ejecut|acumul|reun|bloque|esquiv|pate|cort|empuj|agarr|salt|corr|atac|absorb|desvi|cubr|interpon|alz)${VERBO}\\b`
);
var NUCLEO = /\b(materia|cuerpo|atom\w*|molecul\w*|celul\w*|cohesion|conciencia|mente|alma|espiritu|tiempo|espacio|espacio-tiempo|conceptos?|conceptual\w*|ideas?|formas? platonicas?|existencia|inexistencia|causalidad|entropia|energia|raiz|ontologic\w*|narrativ\w*|pasivas?|regeneracion|inmortalidad|realidad|leyes? fisicas?|estructura|esencia|participacion|nous|hipostasis|anclajes?|coherencia)\b/;
var CONSECUENCIA = /\b(si (no es|no lo|no la|logra|impacta|alcanza|toca|conecta)|de (no ser|lograr)|mand\w* (a|al|hacia|contra)|(sale|salir) volando|derrib\w*|arroj\w*|estrell\w*|impact\w*|provoc\w*|caus\w*|produc\w*|resultado|lo que hace que|haciendo que|termin\w*|qued\w*|desintegr\w*|destroz\w*|pulveriz\w*|reinici\w*|corromp\w*|corrupcion|auto-?destru\w*|colaps\w*|desaparec\w*|deja de existir|borr\w*|anul\w*|destru\w*|elimin\w*|romp\w*|neutraliz\w*|bloque\w*|absorb\w*|desvi\w*|redirig\w*|consecuencia\w*|efecto\w*)/;
var LIMITES = {
  alcance: /\b(alcance|area|radio|rango|dominio|zona|solo (afecta|al objetivo|a un objetivo)|objetivo unico|un solo objetivo)\b/,
  duracion: /\b(duracion|dura|durante|instante|permanente\w*|temporal\w*|turnos?|minutos?|segundos?)\b/,
  requisitos: /\b(requiere\w*|necesita\w*|canaliz\w*|concentracion|costo|coste|gasta\w*|consume\w*|condicion\w*|solo si|siempre que|a cambio de|sacrific\w*)\b/,
  contraindicaciones: /\b(no funciona (contra|si|en)|no afecta a|excepto|salvo|debilidad\w*|limitacion\w*|limites?|contraindicacion\w*|no sirve (contra|si))\b/
};
var QUE_ROMPE = /\b(pasivas?|regeneracion|inmortalidad|anclajes?|raiz|defensas?|estructura\w*|cohesion|molecul\w*|atom\w*|hax\w*|resistencias?|inmunidad\w*|existencia|concepto de|coherencia narrativa|continuidad|formas? platonicas?|idea de|alma|conciencia|cuerpo|nucleo|esencia|participacion|fuente|causalidad|durabilidad|stats?)\b/;
var RIVAL = /\b(rival|enemigo|oponente|adversario|contrincante|objetivo|contrario)\b|\b(lo|la|le|los|las) [a-z]+(a|an|e|en)\b/;
var ATAQUE_ENTRANTE = /\b(ataque|golpe|tecnica|habilidad|impacto|hax|proyectil|efecto|dano)\b/;
var MARCOS = {
  "f\xEDsica cl\xE1sica": /\b(newton\w*|f ?= ?ma|masa|aceleracion|fuerza|energia cinetica|conservacion de (la )?energia|inercia|momento lineal|friccion|presion)\b/,
  "f\xEDsica cu\xE1ntica": /\b(cuantic\w*|superposicion|entrelazamiento|efecto tunel|incertidumbre|particulas?)\b/,
  relatividad: /\b(relativ\w*|espacio-?tiempo|dilatacion|marco de referencia|curvatura|velocidad de la luz|gravedad|gravitacional\w*)\b/,
  "entrop\xEDa / termodin\xE1mica": /\b(entropia|termodinamic\w*)\b/,
  platonismo: /\b(platon\w*|formas? platonicas?|mundo de las ideas|conceptos?|conceptual\w*|arquetipos?)\b/,
  neoplatonismo: /\b(neoplaton\w*|plotino|nous|hipostasis|emanacion|psyche|hyle)\b/,
  "ontolog\xEDa / metaf\xEDsica": /\b(ontologi\w*|metafisic\w*|existencia|inexistencia|no-ser|axiom\w*|raiz conceptual|trasciend\w*|transciend\w*)\b/,
  causalidad: /\b(causalidad|causa y efecto|causal\w*)\b/,
  l\u00F3gica: /\b(logica|silogismo|premisas?|paradoja\w*)\b/,
  teolog\u00EDa: /\b(teolog\w*|divin\w*|dios|creador)\b/,
  dualismo: /\b(dualismo|dualidad|luz y oscuridad|ser y no ser)\b/
};
var UNO_NEOPLATONICO = /\b(el|lo) Uno\b/;
var HIPOSTASIS = /\b(nous|intelecto|alma del mundo|psyche|hyle|materia)\b/;
var ESCALA_CUANTICA = /\b(macroscopic\w*|decoheren\w*|escal\w*|todo (su|mi) cuerpo)\b/;
function nuevo(id, nombre, severidad, explicacion, correccion, fragmentos = []) {
  return { regla: id, nombre, severidad, fragmentos: fragmentos.map((f) => citar(f)), explicacion, correccion };
}
function sev(modalidad, estricta, blanda = "sugerencia") {
  return modalidad === "argumentativo" || modalidad === "unlimited" ? estricta : blanda;
}
function primera(oraciones, regex) {
  const encontrada = buscar(oraciones, regex)[0];
  return encontrada ? encontrada.oracion.original : void 0;
}
function revisarContenido(texto, { modalidad = "argumentativo", tipo = "ataque" } = {}) {
  const norm = normalizar(texto);
  const oraciones = dividirOraciones(texto);
  const palabras = contarPalabras(texto);
  const estricto = modalidad === "argumentativo" || modalidad === "unlimited";
  const hallazgos = [];
  const minimo = modalidad === "simple" ? 4 : 8;
  if (palabras < minimo) {
    hallazgos.push(
      nuevo(
        "muy_corto",
        "Texto demasiado corto",
        "grave",
        `Tiene ${palabras} palabra(s): no alcanza para evaluar la acci\xF3n.`,
        "Escribe al menos qu\xE9 hace el personaje y qu\xE9 le pasa al rival."
      )
    );
  } else if (estricto && palabras < 40) {
    hallazgos.push(
      nuevo(
        "corto_para_modalidad",
        "Corto para la modalidad",
        "advertencia",
        `Tiene ${palabras} palabras. En ${modalidad} cuesta cubrir inicio, n\xFAcleo, consecuencia y justificaci\xF3n en tan poco.`,
        "Desarrolla el c\xF3mo y el por qu\xE9 del efecto."
      )
    );
  }
  if (modalidad === "simple" && palabras > 120) {
    hallazgos.push(
      nuevo(
        "largo_para_simple",
        "Largo para rol simple",
        "sugerencia",
        `Tiene ${palabras} palabras. El rol simple es texto corto, directo y de acci\xF3n.`,
        "Recorta la explicaci\xF3n y deja la acci\xF3n y su efecto."
      )
    );
  }
  const estructura = {
    inicio: INICIO.test(norm),
    nucleo: NUCLEO.test(norm),
    consecuencia: CONSECUENCIA.test(norm)
  };
  if (!estructura.inicio) {
    hallazgos.push(
      nuevo(
        "falta_inicio",
        "No se ve c\xF3mo se lanza",
        modalidad === "simple" ? "advertencia" : sev(modalidad, "advertencia"),
        modalidad === "simple" ? "No queda clara la acci\xF3n f\xEDsica: \xBFgolpea, corre, bloquea, dispara?" : "Falta el Inicio: c\xF3mo se lanza o se manifiesta el ataque o la defensa.",
        "Abre con la acci\xF3n concreta del personaje."
      )
    );
  }
  if (!estructura.nucleo && modalidad !== "simple") {
    hallazgos.push(
      nuevo(
        "falta_nucleo",
        "No se ve qu\xE9 afecta",
        sev(modalidad, "advertencia"),
        "Falta el N\xFAcleo: qu\xE9 afecta realmente (materia, conciencia, tiempo, conceptos, existencia\u2026).",
        "Di sobre qu\xE9 nivel act\xFAa la t\xE9cnica."
      )
    );
  }
  if (!estructura.consecuencia) {
    hallazgos.push(
      nuevo(
        "falta_consecuencia",
        "No se ve la consecuencia",
        sev(modalidad, "advertencia"),
        tipo === "defensa" ? "No queda claro qu\xE9 le pasa al ataque entrante: \xBFse bloquea, se desv\xEDa, se anula?" : "Falta la Consecuencia: qu\xE9 pasa si impacta o si no es detenido.",
        tipo === "defensa" ? "Cierra diciendo c\xF3mo queda neutralizado el ataque." : 'Cierra con el efecto, planteado como condici\xF3n: "si impacta\u2026".'
      )
    );
  }
  const justificaciones = buscar(oraciones, JUSTIFICACION).length;
  if (justificaciones === 0 && palabras >= minimo && modalidad !== "simple") {
    hallazgos.push(
      nuevo(
        "sin_justificacion",
        "No explica por qu\xE9 funciona",
        estricto ? "grave" : "sugerencia",
        'No hay ning\xFAn "porque", "ya que", "mediante", "al + verbo"\u2026 El texto dice qu\xE9 pasa, pero no por qu\xE9.',
        "Agrega el principio que lo sostiene: una ley f\xEDsica, la l\xF3gica interna o un nivel ontol\xF3gico. Basta una frase."
      )
    );
  }
  if (tipo === "defensa") {
    if (!ATAQUE_ENTRANTE.test(norm)) {
      hallazgos.push(
        nuevo(
          "defensa_sin_objetivo",
          "No dice qu\xE9 defiende",
          "advertencia",
          "Una defensa debe decir contra qu\xE9 parte del ataque act\xFAa.",
          "Nombra el ataque o el aspecto que neutralizas (su impacto, su hax, su n\xFAcleo)."
        )
      );
    }
  } else {
    if (!RIVAL.test(norm)) {
      hallazgos.push(
        nuevo(
          "sin_efecto_en_rival",
          "No menciona al rival",
          "sugerencia",
          "No queda expl\xEDcito c\xF3mo afecta al enemigo.",
          "Di qu\xE9 le pasa al rival: \xBFlo atraviesa, lo pulveriza, lo frena?"
        )
      );
    }
    if (estricto && !QUE_ROMPE.test(norm)) {
      hallazgos.push(
        nuevo(
          "sin_objetivo_especifico",
          "No dice qu\xE9 le rompe",
          "advertencia",
          "En argumentativo y unlimited hay que ser espec\xEDfico con lo que se le rompe al rival.",
          'Ejemplos: "anula su pasiva X", "rompe la continuidad narrativa que permite su regeneraci\xF3n".'
        )
      );
    }
  }
  const limites = Object.fromEntries(Object.entries(LIMITES).map(([k, re]) => [k, re.test(norm)]));
  const conLimites = Object.values(limites).filter(Boolean).length;
  const faltan = Object.keys(limites).filter((k) => !limites[k]);
  if (conLimites === 0 && tipo !== "defensa" && modalidad !== "simple") {
    hallazgos.push(
      nuevo(
        "sin_limites",
        "Sin l\xEDmites",
        sev(modalidad, "advertencia"),
        "No fija alcance, duraci\xF3n, requisitos ni contraindicaciones.",
        "Agrega al menos uno: el alcance (solo el objetivo, un \xE1rea, un dominio), la duraci\xF3n o un requisito."
      )
    );
  } else if (estricto && conLimites === 1 && tipo !== "defensa") {
    hallazgos.push(
      nuevo(
        "limites_parciales",
        "L\xEDmites incompletos",
        "sugerencia",
        `Solo se ve un tipo de l\xEDmite. Faltan: ${faltan.join(", ")}.`,
        "No hacen falta todos, pero los l\xEDmites claros hacen el ataque m\xE1s dif\xEDcil de debunkear."
      )
    );
  }
  const marcos = Object.entries(MARCOS).filter(([, re]) => re.test(norm)).map(([nombre]) => nombre);
  if (UNO_NEOPLATONICO.test(texto) && !marcos.includes("neoplatonismo")) marcos.push("neoplatonismo");
  if (estricto && marcos.length === 0) {
    hallazgos.push(
      nuevo(
        "sin_marco",
        "Sin marco que lo sostenga",
        "advertencia",
        "El BR argumentativo usa f\xEDsica, filosof\xEDa, metaf\xEDsica, l\xF3gica o teolog\xEDa para justificar los poderes. No se detecta ninguno.",
        "Ap\xF3yate en un principio: causalidad, platonismo, relatividad, entrop\xEDa, jerarqu\xEDa conceptos > ideas > materia\u2026"
      )
    );
  }
  if (marcos.includes("neoplatonismo") && !HIPOSTASIS.test(norm) && !UNO_NEOPLATONICO.test(texto)) {
    hallazgos.push(
      nuevo(
        "neoplatonismo_sin_hipostasis",
        "Neoplatonismo sin hip\xF3stasis",
        "advertencia",
        "Usas neoplatonismo pero no dices desde qu\xE9 hip\xF3stasis act\xFAas (el Uno, el Nous, el Alma o la Materia).",
        "Define la hip\xF3stasis y a qu\xE9 nivel del rival apuntas: su Forma (Nous), su participaci\xF3n (Alma) o su manifestaci\xF3n f\xEDsica.",
        [primera(oraciones, MARCOS.neoplatonismo)].filter(Boolean)
      )
    );
  }
  if (marcos.includes("f\xEDsica cu\xE1ntica") && !ESCALA_CUANTICA.test(norm)) {
    hallazgos.push(
      nuevo(
        "cuantica_sin_escala",
        "Cu\xE1ntica sin escalar",
        "sugerencia",
        "La superposici\xF3n o el efecto t\xFAnel se dan en part\xEDculas. Si los aplicas al cuerpo entero del personaje, el rival puede debunkearlo por decoherencia.",
        "Explica c\xF3mo el efecto escala a nivel macrosc\xF3pico o qu\xE9 lo mantiene coherente.",
        [primera(oraciones, MARCOS["f\xEDsica cu\xE1ntica"])].filter(Boolean)
      )
    );
  }
  const ordenados = ordenarPorSeveridad(hallazgos);
  const resumen = resumir(ordenados);
  const revisionManual = ["\xBFEl personaje puede hacer esto seg\xFAn su wiki o su ficha (stats, haxs, personalidad)?"];
  if (estricto) {
    revisionManual.push(
      "\xBFLos conceptos est\xE1n bien usados? Por ejemplo: \xBFel platonismo se aplica a Formas y no a objetos?",
      "\xBFLa jerarqu\xEDa es coherente (conceptos > ideas > materia)?"
    );
  }
  if (modalidad === "unlimited") revisionManual.push("\xBFSigue siendo coherente con este nivel de poder? El BR unlimited se vuelve incoherente si no se controla.");
  if (modalidad === "lore") revisionManual.push("\xBFEs coherente con la historia y la personalidad del personaje?");
  if (modalidad === "simple") revisionManual.push("\xBFSe entiende en una sola lectura? El rol simple prioriza la claridad.");
  return {
    revisor: "contenido",
    modalidad,
    tipo,
    palabras,
    veredicto: veredicto(resumen),
    resumen,
    estructura,
    formula: {
      accion: estructura.inicio,
      como_y_por_que: justificaciones > 0,
      que_rompe: tipo === "defensa" ? ATAQUE_ENTRANTE.test(norm) : QUE_ROMPE.test(norm),
      efecto: estructura.consecuencia,
      limitacion: conLimites > 0
    },
    limites,
    marcos_detectados: marcos,
    hallazgos: ordenados,
    revision_manual: revisionManual
  };
}

// src/falacias.js
var MAX_POR_REGLA = 3;
var ATEMPORAL = /\b(atemporal\w*|no depende del tiempo|independiente del tiempo|fuera del tiempo|(trasciende|transciende) (el|al) tiempo|mas alla del tiempo|no (esta|existe) (sujet[oa] al|en el) tiempo|inmune al tiempo|ajen[oa] al tiempo)/;
var USA_TIEMPO = /\b(velocidad\w*|veloz\w*|rapid\w*|aceler\w*|instantane\w*|(mili)?segundos?\b|minutos?\b|horas?\b|mach \d+|ftl\b|en un instante|en menos de|km\/s|m\/s)/;
var AESPACIAL = /\b(aespacial\w*|no depende del espacio|independiente del espacio|fuera del espacio|(trasciende|transciende) (el|al) espacio|mas alla del espacio|no ocupa (lugar|espacio)|sin (ubicacion|posicion)|no tiene (ubicacion|posicion))/;
var USA_ESPACIO = /\b(se (acerca|aleja|mueve|desplaza)\w*|distancia\w*|(kilo)?metros?\b|(corre|salta|vuela) hacia|se teletransport\w*|coordenada\w*)/;
var SIN_CONCEPTOS = /\b(no depende de (los |ningun )?conceptos?|independiente de (los )?conceptos|(trasciende|transciende) (el platonismo|los conceptos|lo conceptual|el nivel conceptual)|mas alla de (los conceptos|lo conceptual|el platonismo))/;
var OPERA_CON_CONCEPTOS = /\b(mediante|usando|a traves de|gracias a|por medio de|utilizando|valiendose de|apoyandose en) (el |los |la |las |un |una |su |sus )?(conceptos?|ideas?|formas? platonicas?)\b/;
var INTANGIBLE = /\b(intangib\w*|inmaterial\w*|incorpore\w*|no tiene cuerpo|sin cuerpo fisico)/;
var CONTACTO = /\b(golpea|golpeo|toca|toco|agarra|agarro|patea|pateo|empuja|empujo)\b|\bcon (su|mi|el) (puno|mano|manos|pierna|pie|cuerpo|codo|rodilla)\b/;
var VUELVE_TANGIBLE = /\b(se vuelve|vuelve|hace|haciendo) (tangible|material|solid[oa])/;
var AUTORIDAD = /\b(porque|ya que|pues|dado que|puesto que|por ser|al ser|debido a que) (es |soy |eres |sigue siendo |simplemente es |simplemente soy )?(mucho |muy |demasiado |el |la |un |una )?(mas fuerte|mas poderos[oa]|fuerte|superior|dios|omnipotente|todopoderos[oa]|invencible|imparable|saitama|goku|absolut[oa]|perfect[oa]|el protagonista)\b/;
var AUTOHIT = /\b(no (puede|podra|podria|hay forma de|hay manera de|tiene forma de) (esquivar\w*|defender\w*|bloquear\w*|evitar\w*|escapar\w*|reaccionar\w*|detener\w*|resistir\w*)|imposible de (esquivar|bloquear|evitar|detener|resistir|defender)|inesquivable\w*|imbloqueable\w*|ineludible\w*|inevitable\w*|(impacta|acierta|conecta) (si o si|siempre|sin falta|de todas formas)|garantizad[oa]s?|no falla nunca|nunca falla)/;
var RESULTADO = /\b((lo|la|los|las) mata\b|muere (al instante|instantaneamente|sin remedio|en el acto)|queda (muert[oa]|derrotad[oa]|borrad[oa]|eliminad[oa])|pierde la pelea|gano la pelea|fin de la pelea|game over)/;
var NO_SELL = /\b(no (me|le|te|nos|les) (afecta\w*|hace (nada|dano|efecto)|dana|toca|llega)|(es|soy|eres|sera) inmune\w*|no recib\w* (ningun )?dano|(sale|queda) ilesa?|ni (me|le) (hace|hizo) (cosquillas|nada|dano)|(me |se )?(lo |la )?tankea\w*)/;
var EFECTO_ABSOLUTO = /\b((borra|destruye|anula|elimina|ignora|niega|cancela|aniquila|erradica|rompe|desintegra)\w* (absolutamente todo|todo\b(?! (su|sus|el|la|los|las|tipo)\b)|cualquier cosa|lo que sea)|todo (se borra|desaparece|es borrado|es destruido|se destruye|deja de existir))/;
var ESPECIFICA = /(:|\b(incluyendo|incluye|es decir|o sea|especificamente|en concreto|en especifico|como (su|sus|la|las|el|los)|lo que incluye)\b)/;
var TRASCIENDE = /\b(trasciend\w*|transciend\w*|trascendi\w*|transcendi\w*|trascender|transcender|(va|esta|queda) mas alla de)/;
var CAUSAL = /\b(porque|ya que|dado que|puesto que)\b/;
var JUSTIFICACION_VACIA = /\b(porque (si|asi es|lo digo|yo lo digo|es asi|puede|puedo|quiero|quiere|se me da la gana|me da la gana)\s*([.,;:!?)]|$)|simplemente (ocurre|pasa|sucede|funciona)\s*([.,;:!?)]|$))/;
var HIPERBOLE = /\b(infinit\w*|omnipoten\w*|omniscien\w*|ilimitad\w*|todopoderos\w*|poder absoluto|absolutamente invencible)/;
var DEFINE = /(:|\b(es decir|o sea|entendido como|en el sentido de|definido como|lo que significa|significa que)\b)/;
var FTL = /\b(mas rapido que la luz|ftl\b|supera la velocidad de la luz|velocidad (infinita|superior a la de la luz|superior a la luz)|superlumin\w*)/;
var PALABRAS_VACIAS = /* @__PURE__ */ new Set([
  "puede",
  "pueden",
  "podria",
  "estar",
  "tiene",
  "tener",
  "hacer",
  "nadie",
  "nada",
  "todo",
  "todos",
  "cualquier",
  "ningun",
  "ninguna",
  "ninguno",
  "cuando",
  "donde",
  "sobre",
  "entre",
  "tambien",
  "siempre",
  "nunca",
  "porque",
  "como",
  "para",
  "mismo",
  "misma",
  "sigue",
  "siendo",
  "forma",
  "manera",
  "ataque"
]);
function raices(fragmento) {
  const palabras = fragmento.split(/[^a-z]+/).filter((p) => p.length >= 5 && !PALABRAS_VACIAS.has(p));
  return palabras.map((p) => {
    const formas = /* @__PURE__ */ new Set([p.slice(0, 4)]);
    const sinPrefijo = p.replace(/^(des|in|im|ir)/, "");
    if (sinPrefijo.length >= 4) formas.add(sinPrefijo.slice(0, 4));
    return formas;
  });
}
function esCircular(norm) {
  const m = norm.match(CAUSAL);
  if (!m) return false;
  const afirmacion = norm.slice(0, m.index).split(/[,;:]/).pop().split(/\s+/).slice(-8).join(" ");
  const razon = norm.slice(m.index + m[0].length).split(/[,;:.]/)[0];
  const raicesRazon = raices(razon);
  if (raicesRazon.length === 0 || raicesRazon.length > 6) return false;
  const raicesAfirmacion = new Set(raices(afirmacion).flatMap((formas) => [...formas]));
  const repetidas = raicesRazon.filter((formas) => [...formas].some((f) => raicesAfirmacion.has(f)));
  return repetidas.length / raicesRazon.length >= 0.5;
}
var REGLAS = [
  {
    id: "auto_nerf_temporal",
    nombre: "Auto-nerf temporal",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Dices que no dependes del tiempo, pero usas velocidad o duraci\xF3n. Usar velocidad ya te ata a un marco temporal.",
    correccion: 'Quita la velocidad o la duraci\xF3n, o explica c\xF3mo act\xFAa sin tiempo. Por ejemplo: el efecto existe como condici\xF3n, no como un evento que ocurre "r\xE1pido".',
    detectar(ctx) {
      const afirma = buscar(ctx.oraciones, ATEMPORAL);
      const usa = buscar(ctx.oraciones, USA_TIEMPO, { omitirNegadas: true });
      if (!afirma.length || !usa.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, usa[0].oracion.original] }];
    }
  },
  {
    id: "auto_nerf_espacial",
    nombre: "Auto-nerf espacial",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Dices que no dependes del espacio, pero te mueves, te acercas o mides distancias. Moverse ya te ata a un marco espacial.",
    correccion: "Quita el movimiento o la distancia, o explica c\xF3mo el ataque llega sin recorrer espacio. Por ejemplo: el efecto se da en el rival sin trayecto.",
    detectar(ctx) {
      const afirma = buscar(ctx.oraciones, AESPACIAL);
      const usa = buscar(ctx.oraciones, USA_ESPACIO, { omitirNegadas: true });
      if (!afirma.length || !usa.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, usa[0].oracion.original] }];
    }
  },
  {
    id: "contradiccion_conceptual",
    nombre: "Contradicci\xF3n de nivel conceptual",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Dices que trasciendes los conceptos o el platonismo, pero despu\xE9s act\xFAas mediante un concepto o una idea. Eso te vuelve a hacer dependiente del nivel conceptual.",
    correccion: "Si trasciendes lo conceptual, el ataque debe actuar sobre los conceptos desde arriba (rompi\xE9ndolos o anul\xE1ndolos), no a trav\xE9s de ellos.",
    detectar(ctx) {
      const afirma = buscar(ctx.oraciones, SIN_CONCEPTOS);
      const usa = buscar(ctx.oraciones, OPERA_CON_CONCEPTOS, { omitirNegadas: true });
      if (!afirma.length || !usa.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, usa[0].oracion.original] }];
    }
  },
  {
    id: "intangible_con_contacto",
    nombre: "Intangible pero golpea",
    severidad: { simple: "advertencia", argumentativo: "advertencia", unlimited: "advertencia" },
    explicacion: "El personaje es intangible o inmaterial, pero golpea o toca. Si puede interactuar para golpear, el rival puede usar esa misma interacci\xF3n para da\xF1arlo.",
    correccion: "Explica c\xF3mo interact\xFAa siendo intangible. Por ejemplo: solo el punto de impacto se vuelve tangible durante el golpe, y di qu\xE9 riesgo implica eso.",
    detectar(ctx) {
      if (VUELVE_TANGIBLE.test(ctx.norm)) return [];
      const afirma = buscar(ctx.oraciones, INTANGIBLE, { omitirNegadas: true });
      const contacto = buscar(ctx.oraciones, CONTACTO, { omitirNegadas: true });
      if (!afirma.length || !contacto.length) return [];
      return [{ fragmentos: [afirma[0].oracion.original, contacto[0].oracion.original] }];
    }
  },
  {
    id: "autoridad_del_personaje",
    nombre: "Apelaci\xF3n al poder del personaje",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Justificas el efecto solo con que el personaje es fuerte, superior o un dios. Que sea Saitama o dios no significa que pueda hacer cualquier cosa sin explicar c\xF3mo.",
    correccion: 'Cambia "porque es m\xE1s fuerte" por el mecanismo: qu\xE9 hace exactamente y por qu\xE9 eso supera al ataque o a la defensa.',
    detectar(ctx) {
      return buscar(ctx.oraciones, AUTORIDAD).filter(({ oracion, posicion, coincidencia }) => {
        const despues = oracion.norm.slice(posicion + coincidencia.length);
        return !(coincidencia.endsWith("superior") && /^ (en|al|a)\b/.test(despues));
      }).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    }
  },
  {
    id: "justificacion_vacia",
    nombre: "Justificaci\xF3n vac\xEDa",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: '"Porque s\xED", "porque puede" o "simplemente ocurre" no explica nada. El rival puede contestar lo mismo.',
    correccion: "Di qu\xE9 principio o mecanismo hace que funcione: una ley f\xEDsica, la l\xF3gica interna del universo o un nivel ontol\xF3gico.",
    detectar(ctx) {
      return buscar(ctx.oraciones, JUSTIFICACION_VACIA).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    }
  },
  {
    id: "autohit",
    nombre: "Autohit / control del rival",
    severidad: { simple: "grave", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Decides por el rival que no puede esquivar, bloquear o defenderse. C\xF3mo reacciona lo decide el rival. Tu texto solo puede justificar por qu\xE9 ser\xEDa dif\xEDcil de evitar.",
    correccion: 'Quita el "no puede esquivar" y explica la propiedad del ataque que lo vuelve dif\xEDcil de evitar, para que el rival tenga que contestarla.',
    detectar(ctx) {
      return buscar(ctx.oraciones, AUTOHIT, { omitirCondicionales: true }).map(
        ({ oracion }) => CAUSA.test(oracion.norm) ? {
          fragmentos: [oracion.original],
          severidad: "sugerencia",
          detalle: "Tiene justificaci\xF3n, pero revisa que no le quite al rival la posibilidad de reaccionar."
        } : { fragmentos: [oracion.original] }
      );
    }
  },
  {
    id: "resultado_impuesto",
    nombre: "Resultado impuesto",
    severidad: { simple: "sugerencia", argumentativo: "advertencia", unlimited: "advertencia" },
    explicacion: "Das por hecho el resultado sobre el rival (lo mata, queda derrotado). La consecuencia se plantea como condici\xF3n, no como hecho.",
    correccion: 'Escr\xEDbelo como condicional: "si impacta\u2026" o "si no es detenido\u2026".',
    detectar(ctx) {
      return buscar(ctx.oraciones, RESULTADO, { omitirCondicionales: true }).map(({ oracion }) => ({
        fragmentos: [oracion.original]
      }));
    }
  },
  {
    id: "negacion_sin_justificacion",
    nombre: "Tankeo sin justificaci\xF3n",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Dices que el ataque no te afecta o que lo tankeas, pero no explicas por qu\xE9.",
    correccion: "Di qu\xE9 parte del ataque evitas, anulas o superas (su nivel, su n\xFAcleo o su mecanismo) y por qu\xE9 tu personaje puede hacerlo.",
    detectar(ctx) {
      return buscar(ctx.oraciones, NO_SELL).filter(({ oracion }) => !estaJustificada(ctx.oraciones, oracion.indice)).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    }
  },
  {
    id: "trascendencia_sin_mecanismo",
    nombre: "Trascendencia sin explicar",
    severidad: { simple: "advertencia", argumentativo: "grave", unlimited: "grave" },
    explicacion: "Dices que trasciendes algo, pero no explicas c\xF3mo ni por qu\xE9. Trascender exige decir el por qu\xE9 y el c\xF3mo, aunque sea en una frase.",
    correccion: 'Agrega el mecanismo: qu\xE9 marco superas y por qu\xE9 ya no dependes de \xE9l. Por ejemplo: "trasciende X porque su existencia ya no depende de Y".',
    detectar(ctx) {
      return buscar(ctx.oraciones, TRASCIENDE, { omitirNegadas: true }).filter(({ oracion }) => !estaJustificada(ctx.oraciones, oracion.indice)).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    }
  },
  {
    id: "efecto_absoluto_sin_especificar",
    nombre: "Efecto absoluto sin especificar",
    severidad: { simple: "sugerencia", argumentativo: "advertencia", unlimited: "advertencia" },
    explicacion: '"Borra todo" o "destruye cualquier cosa" sin decir qu\xE9, exactamente. No se puede evaluar ni contestar.',
    correccion: "Di qu\xE9 le rompes exactamente: pasivas, anclajes, coherencia narrativa, ra\xEDz de regeneraci\xF3n, etc.",
    detectar(ctx) {
      return buscar(ctx.oraciones, EFECTO_ABSOLUTO).filter(({ oracion }) => !ESPECIFICA.test(oracion.norm)).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    }
  },
  {
    id: "circularidad",
    nombre: "Posible razonamiento circular",
    severidad: { simple: "advertencia", argumentativo: "advertencia", unlimited: "advertencia" },
    explicacion: 'La raz\xF3n repite la afirmaci\xF3n con otras palabras (por ejemplo, "es indestructible porque no puede ser destruido").',
    correccion: "Cambia la raz\xF3n por un mecanismo independiente de la afirmaci\xF3n: de d\xF3nde sale esa propiedad.",
    detectar(ctx) {
      return ctx.oraciones.filter((o) => esCircular(o.norm)).map((o) => ({ fragmentos: [o.original] }));
    }
  },
  {
    id: "hiperbole_sin_definir",
    nombre: "Infinito u omnipotente sin definir",
    severidad: { simple: "advertencia", argumentativo: "advertencia", unlimited: "sugerencia" },
    explicacion: 'Usas "infinito", "omnipotente" o "ilimitado" sin decir en qu\xE9 sentido. Sin definirlos, el rival puede reducirlos a hip\xE9rbole.',
    correccion: "Define el t\xE9rmino: infinito respecto de qu\xE9, y omnipotente dentro de qu\xE9 marco o con qu\xE9 l\xEDmites.",
    detectar(ctx) {
      const sinDefinir = buscar(ctx.oraciones, HIPERBOLE).filter(({ oracion }) => !DEFINE.test(oracion.norm));
      if (!sinDefinir.length) return [];
      const veces = sinDefinir.length;
      return [
        {
          fragmentos: [sinDefinir[0].oracion.original],
          detalle: veces > 1 ? `Aparece ${veces} veces sin definir.` : void 0
        }
      ];
    }
  },
  {
    id: "ftl_sin_justificacion",
    nombre: "Velocidad FTL sin justificar",
    severidad: { simple: "sugerencia", argumentativo: "advertencia", unlimited: "advertencia" },
    explicacion: "Ir m\xE1s r\xE1pido que la luz con masa choca con la relatividad, porque exigir\xEDa energ\xEDa infinita. Sin justificarlo, es f\xE1cil de debunkear.",
    correccion: "Explica c\xF3mo evitas el l\xEDmite. Por ejemplo, curvando el espacio-tiempo en vez de recorrerlo, o con la l\xF3gica interna de tu universo.",
    detectar(ctx) {
      return buscar(ctx.oraciones, FTL, { omitirNegadas: true }).filter(({ oracion }) => !estaJustificada(ctx.oraciones, oracion.indice)).map(({ oracion }) => ({ fragmentos: [oracion.original] }));
    }
  }
];
var REVISION_MANUAL = [
  "\xBFEl personaje tiene ese hax o ese stat seg\xFAn su wiki o su ficha aprobada?",
  "Escalado: \xBFse usa una haza\xF1a de un contexto para justificar otro distinto?",
  "Si es un debunk: \xBFresponde al ataque real del rival o a una versi\xF3n deformada (hombre de paja)?",
  "\xBFLo que se afirma al principio sigue valiendo al final, o cambian las reglas a mitad del texto?"
];
var REGLAS_DE_FALACIAS = REGLAS.map(({ id, nombre, explicacion }) => ({ id, nombre, explicacion }));
function revisarFalacias(texto, { modalidad = "argumentativo" } = {}) {
  const ctx = { texto, norm: normalizar(texto), oraciones: dividirOraciones(texto), modalidad };
  const hallazgos = [];
  for (const regla of REGLAS) {
    for (const resultado of regla.detectar(ctx).slice(0, MAX_POR_REGLA)) {
      const base = resultado.severidad ?? regla.severidad[modalidad] ?? regla.severidad.argumentativo;
      const severidad = modalidad === "lore" ? "sugerencia" : base;
      hallazgos.push({
        regla: regla.id,
        nombre: regla.nombre,
        severidad,
        fragmentos: [...new Set(resultado.fragmentos)].map((f) => citar(f)),
        explicacion: regla.explicacion,
        correccion: regla.correccion,
        ...resultado.detalle ? { detalle: resultado.detalle } : {}
      });
    }
  }
  const ordenados = ordenarPorSeveridad(hallazgos);
  const resumen = resumir(ordenados);
  const revisionManual = [...REVISION_MANUAL];
  if (modalidad === "lore") {
    revisionManual.unshift(
      "En Lore Rol las falacias est\xE1n permitidas: todo se marc\xF3 como sugerencia. Prioriza la coherencia con la historia del personaje."
    );
  }
  return {
    revisor: "falacias",
    modalidad,
    veredicto: veredicto(resumen),
    resumen,
    hallazgos: ordenados,
    revision_manual: revisionManual
  };
}

// src/formato.js
var ETIQUETA = { grave: "GRAVE", advertencia: "ADVERTENCIA", sugerencia: "SUGERENCIA" };
function lineaResumen({ grave, advertencia, sugerencia }) {
  return `${grave} grave(s), ${advertencia} advertencia(s), ${sugerencia} sugerencia(s)`;
}
function bloqueHallazgos(hallazgos) {
  if (hallazgos.length === 0) return ["No se detectaron problemas por patrones."];
  return hallazgos.flatMap((h, i) => {
    const lineas = [`${i + 1}. **[${ETIQUETA[h.severidad]}] ${h.nombre}**: ${h.explicacion}`];
    for (const f of h.fragmentos) lineas.push(`   > ${f}`);
    if (h.detalle) lineas.push(`   ${h.detalle}`);
    lineas.push(`   *C\xF3mo corregirlo:* ${h.correccion}`);
    return lineas;
  });
}
var marca = (ok) => ok ? "[x]" : "[ ]";
function formatearFalacias(r) {
  return [
    `## Revisi\xF3n de falacias \xB7 ${NOMBRE_MODALIDAD[r.modalidad]}`,
    `**Veredicto:** ${r.veredicto} (${lineaResumen(r.resumen)})`,
    "",
    "### Hallazgos",
    ...bloqueHallazgos(r.hallazgos),
    "",
    "### Para revisar a mano",
    ...r.revision_manual.map((p) => `- ${p}`),
    "",
    "_Revisi\xF3n autom\xE1tica por patrones: puede dar falsos positivos y no reemplaza a un verificador._"
  ].join("\n");
}
function formatearContenido(r) {
  const f = r.formula;
  const conFormula = r.modalidad === "argumentativo" || r.modalidad === "unlimited";
  return [
    `## Revisi\xF3n de contenido \xB7 ${NOMBRE_MODALIDAD[r.modalidad]} \xB7 ${r.tipo} (${r.palabras} palabras)`,
    `**Veredicto:** ${r.veredicto} (${lineaResumen(r.resumen)})`,
    "",
    ...conFormula ? [
      "### F\xF3rmula: acci\xF3n + c\xF3mo + qu\xE9 rompe + efecto + l\xEDmite",
      `- ${marca(f.accion)} Acci\xF3n (c\xF3mo se lanza)`,
      `- ${marca(f.como_y_por_que)} C\xF3mo y por qu\xE9 funciona`,
      `- ${marca(f.que_rompe)} ${r.tipo === "defensa" ? "Contra qu\xE9 defiende" : "Qu\xE9 le rompe al rival"}`,
      `- ${marca(f.efecto)} Efecto / consecuencia`,
      `- ${marca(f.limitacion)} Condici\xF3n o limitaci\xF3n`,
      "",
      `**Marcos detectados:** ${r.marcos_detectados.length ? r.marcos_detectados.join(", ") : "ninguno"}`,
      ""
    ] : [],
    "### Hallazgos",
    ...bloqueHallazgos(r.hallazgos),
    "",
    "### Para revisar a mano",
    ...r.revision_manual.map((p) => `- ${p}`),
    "",
    "_Revisi\xF3n autom\xE1tica por patrones: puede dar falsos positivos y no reemplaza a un verificador._"
  ].join("\n");
}

// src/herramientas.js
var TIPOS = ["ataque", "defensa", "habilidad"];
var MAX_CARACTERES = 2e4;
var ENTRADA_TEXTO = {
  type: "string",
  minLength: 1,
  maxLength: MAX_CARACTERES,
  description: "El texto de BR a revisar, tal como se va a mandar (ataque, defensa, habilidad o debunk)."
};
var ENTRADA_MODALIDAD = {
  type: "string",
  enum: MODALIDADES,
  default: "argumentativo",
  description: 'Modalidad del BR: "simple" (corto y directo), "argumentativo" (filosof\xEDa, f\xEDsica o l\xF3gica), "unlimited" (sin techo de poder) o "lore" (prioriza la historia; las falacias se permiten).'
};
var ENTRADA_TIPO = {
  type: "string",
  enum: TIPOS,
  default: "ataque",
  description: "Qu\xE9 es el texto. Las defensas se eval\xFAan contra el ataque que reciben."
};
var lista = (items) => ({ type: "array", items });
var booleanos = (...claves) => ({
  type: "object",
  properties: Object.fromEntries(claves.map((c) => [c, { type: "boolean" }])),
  required: claves
});
var HALLAZGO = {
  type: "object",
  properties: {
    regla: { type: "string" },
    nombre: { type: "string" },
    severidad: { type: "string", enum: ["grave", "advertencia", "sugerencia"] },
    fragmentos: lista({ type: "string" }),
    explicacion: { type: "string" },
    correccion: { type: "string" },
    detalle: { type: "string" }
  },
  required: ["regla", "nombre", "severidad", "fragmentos", "explicacion", "correccion"]
};
var SALIDA_COMUN = {
  modalidad: { type: "string", enum: MODALIDADES },
  veredicto: { type: "string" },
  resumen: {
    type: "object",
    properties: { grave: { type: "number" }, advertencia: { type: "number" }, sugerencia: { type: "number" } },
    required: ["grave", "advertencia", "sugerencia"]
  },
  hallazgos: lista(HALLAZGO),
  revision_manual: lista({ type: "string" })
};
var REQUERIDOS_COMUNES = ["revisor", "modalidad", "veredicto", "resumen", "hallazgos", "revision_manual"];
var ANOTACIONES = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
var ArgumentoInvalido = class extends Error {
};
function leerTexto(args) {
  if (typeof args.texto !== "string") throw new ArgumentoInvalido('Falta "texto" (debe ser un string).');
  const texto = args.texto.trim();
  if (!texto) throw new ArgumentoInvalido("El texto no puede estar vac\xEDo.");
  if (texto.length > MAX_CARACTERES) {
    throw new ArgumentoInvalido(`El texto es demasiado largo (m\xE1ximo ${MAX_CARACTERES} caracteres).`);
  }
  return texto;
}
function leerOpcion(args, clave, permitidos, porDefecto) {
  const valor = args[clave];
  if (valor === void 0 || valor === null) return porDefecto;
  if (!permitidos.includes(valor)) {
    throw new ArgumentoInvalido(`"${clave}" debe ser uno de: ${permitidos.join(", ")}. Lleg\xF3: ${JSON.stringify(valor)}.`);
  }
  return valor;
}
var HERRAMIENTAS = [
  {
    name: "revisar_contenido",
    title: "Revisar contenido de BR",
    description: 'Revisa un ataque, una defensa o una habilidad de Battle Rol contra las gu\xEDas del servidor: estructura Inicio / N\xFAcleo / Consecuencia, si explica el c\xF3mo y el por qu\xE9, qu\xE9 le rompe al rival, l\xEDmites (alcance, duraci\xF3n, requisitos, contraindicaciones) y qu\xE9 marco lo sostiene (f\xEDsica, platonismo, neoplatonismo\u2026). La revisi\xF3n es por patrones: despu\xE9s completa los puntos de "revision_manual" con tu propio criterio.',
    inputSchema: {
      type: "object",
      properties: { texto: ENTRADA_TEXTO, modalidad: ENTRADA_MODALIDAD, tipo: ENTRADA_TIPO },
      required: ["texto"]
    },
    outputSchema: {
      type: "object",
      properties: {
        revisor: { type: "string", const: "contenido" },
        ...SALIDA_COMUN,
        tipo: { type: "string", enum: TIPOS },
        palabras: { type: "number" },
        estructura: booleanos("inicio", "nucleo", "consecuencia"),
        formula: booleanos("accion", "como_y_por_que", "que_rompe", "efecto", "limitacion"),
        limites: booleanos("alcance", "duracion", "requisitos", "contraindicaciones"),
        marcos_detectados: lista({ type: "string" })
      },
      required: [...REQUERIDOS_COMUNES, "tipo", "palabras", "estructura", "formula", "limites", "marcos_detectados"]
    },
    annotations: ANOTACIONES,
    ejecutar(args) {
      const resultado = revisarContenido(leerTexto(args), {
        modalidad: leerOpcion(args, "modalidad", MODALIDADES, "argumentativo"),
        tipo: leerOpcion(args, "tipo", TIPOS, "ataque")
      });
      return { texto: formatearContenido(resultado), datos: resultado };
    }
  },
  {
    name: "revisar_falacias",
    title: "Revisar falacias de BR",
    description: 'Busca falacias y auto-nerfs en un texto de Battle Rol: auto-nerf temporal o espacial, contradicci\xF3n de nivel conceptual, "lo bloquea porque es m\xE1s fuerte", autohit ("no puede esquivar"), tankeo sin justificar, trascendencia sin mecanismo, "borra todo" sin especificar, razonamiento circular, "infinito" sin definir y FTL sin justificar. En modalidad "lore" todo baja a sugerencia porque ah\xED las falacias se permiten. La revisi\xF3n es por patrones: completa los puntos de "revision_manual" con tu propio criterio.',
    inputSchema: {
      type: "object",
      properties: { texto: ENTRADA_TEXTO, modalidad: ENTRADA_MODALIDAD },
      required: ["texto"]
    },
    outputSchema: {
      type: "object",
      properties: { revisor: { type: "string", const: "falacias" }, ...SALIDA_COMUN },
      required: REQUERIDOS_COMUNES
    },
    annotations: ANOTACIONES,
    ejecutar(args) {
      const resultado = revisarFalacias(leerTexto(args), {
        modalidad: leerOpcion(args, "modalidad", MODALIDADES, "argumentativo")
      });
      return { texto: formatearFalacias(resultado), datos: resultado };
    }
  }
];
function listarHerramientas() {
  return HERRAMIENTAS.map(({ ejecutar, ...definicion }) => definicion);
}
function existeHerramienta(nombre) {
  return HERRAMIENTAS.some((h) => h.name === nombre);
}
function llamarHerramienta(nombre, args = {}) {
  const herramienta = HERRAMIENTAS.find((h) => h.name === nombre);
  if (!herramienta) throw new Error(`Herramienta desconocida: ${nombre}`);
  try {
    const { texto, datos } = herramienta.ejecutar(args && typeof args === "object" ? args : {});
    return { content: [{ type: "text", text: texto }], structuredContent: datos };
  } catch (error) {
    if (!(error instanceof ArgumentoInvalido)) throw error;
    return { content: [{ type: "text", text: `Argumentos inv\xE1lidos: ${error.message}` }], isError: true };
  }
}

// src/protocolo.js
var INFO_SERVIDOR = { name: "br-revisor", title: "Revisor de Battle Rol", version: "1.1.0" };
var VERSIONES_SOPORTADAS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
var INSTRUCCIONES = "Servidor con un \xFAnico prop\xF3sito: revisar textos de Battle Rol (BR). Usa revisar_contenido para la estructura y la calidad del ataque, la defensa o la habilidad, y revisar_falacias para auto-nerfs y falacias. Pasa siempre la modalidad (simple, argumentativo, unlimited o lore). La revisi\xF3n es por patrones: completa los puntos de revision_manual con tu criterio antes de dar un veredicto.";
var PARSE_ERROR = -32700;
var INVALID_REQUEST = -32600;
var METHOD_NOT_FOUND = -32601;
var INVALID_PARAMS = -32602;
var INTERNAL_ERROR = -32603;
var exito = (id, result) => ({ jsonrpc: "2.0", id, result });
var fallo = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
function responder(id, method, params) {
  switch (method) {
    case "initialize": {
      const pedida = params.protocolVersion;
      return exito(id, {
        protocolVersion: VERSIONES_SOPORTADAS.includes(pedida) ? pedida : VERSIONES_SOPORTADAS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: INFO_SERVIDOR,
        instructions: INSTRUCCIONES
      });
    }
    case "ping":
      return exito(id, {});
    case "tools/list":
      return exito(id, { tools: listarHerramientas() });
    case "tools/call":
      if (typeof params.name !== "string") return fallo(id, INVALID_PARAMS, 'tools/call necesita "name".');
      if (!existeHerramienta(params.name)) return fallo(id, INVALID_PARAMS, `Herramienta desconocida: ${params.name}`);
      return exito(id, llamarHerramienta(params.name, params.arguments ?? {}));
    default:
      return fallo(id, METHOD_NOT_FOUND, `M\xE9todo no soportado: ${method}`);
  }
}
function procesarMensaje(mensaje) {
  if (!mensaje || typeof mensaje !== "object" || Array.isArray(mensaje) || mensaje.jsonrpc !== "2.0") {
    return fallo(mensaje?.id, INVALID_REQUEST, "Solicitud JSON-RPC inv\xE1lida.");
  }
  if (typeof mensaje.method !== "string") {
    if ("result" in mensaje || "error" in mensaje) return null;
    return fallo(mensaje.id, INVALID_REQUEST, 'Falta "method".');
  }
  if (!("id" in mensaje)) return null;
  const params = mensaje.params && typeof mensaje.params === "object" ? mensaje.params : {};
  try {
    return responder(mensaje.id, mensaje.method, params);
  } catch (error) {
    return fallo(mensaje.id, INTERNAL_ERROR, `Error interno: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function procesarCuerpo(cuerpo) {
  if (!Array.isArray(cuerpo)) return procesarMensaje(cuerpo);
  if (cuerpo.length === 0) return fallo(null, INVALID_REQUEST, "Lote vac\xEDo.");
  const respuestas = cuerpo.map(procesarMensaje).filter(Boolean);
  return respuestas.length ? respuestas : null;
}
function procesarTexto(texto) {
  let cuerpo;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return fallo(null, PARSE_ERROR, "El cuerpo no es JSON v\xE1lido.");
  }
  return procesarCuerpo(cuerpo);
}
var esErrorDeParseo = (respuesta) => !Array.isArray(respuesta) && respuesta?.error?.code === PARSE_ERROR;

// cloudflare/worker.js
var RUTA_MCP = "/mcp";
var MAX_CARACTERES_CUERPO = 256 * 1024;
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400"
};
function json(cuerpo, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
function sinCuerpo(status, encabezados = {}) {
  return new Response(null, { status, headers: { ...CORS, ...encabezados } });
}
function portada(origen) {
  const texto = `${INFO_SERVIDOR.title} (${INFO_SERVIDOR.name} ${INFO_SERVIDOR.version})

Servidor MCP para revisar contenido y falacias en textos de Battle Rol.
Agr\xE9galo como conector con esta URL: ${origen}${RUTA_MCP}
`;
  return new Response(texto, { headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS } });
}
var worker_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return sinCuerpo(204);
    if (url.pathname === "/" && request.method === "GET") return portada(url.origin);
    if (url.pathname !== RUTA_MCP && url.pathname !== `${RUTA_MCP}/`) {
      return json({ error: `No encontrado. El endpoint MCP es ${RUTA_MCP}.` }, 404);
    }
    if (request.method !== "POST") return sinCuerpo(405, { Allow: "POST, OPTIONS" });
    const version = request.headers.get("mcp-protocol-version");
    if (version && !VERSIONES_SOPORTADAS.includes(version)) {
      return json(fallo(null, -32600, `Versi\xF3n de protocolo no soportada: ${version}`), 400);
    }
    const texto = await request.text();
    if (texto.length > MAX_CARACTERES_CUERPO) return json(fallo(null, -32600, "Mensaje demasiado grande."), 413);
    const respuesta = procesarTexto(texto);
    if (respuesta === null) return sinCuerpo(202);
    return json(respuesta, esErrorDeParseo(respuesta) ? 400 : 200);
  }
};
export {
  worker_default as default
};
