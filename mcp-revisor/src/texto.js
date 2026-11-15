// Utilidades de texto compartidas por los dos revisores.

/** Minúsculas y sin tildes, para que las reglas no dependan de cómo se escribió. */
export function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Divide el texto en oraciones. Cada una guarda el original (para citarlo en el
 * informe) y la versión normalizada (para buscar patrones).
 */
export function dividirOraciones(texto) {
  return texto
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((original, indice) => ({ indice, original, norm: normalizar(original) }));
}

export function citar(oracion, max = 160) {
  const limpio = oracion.replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

export function contarPalabras(texto) {
  return (texto.match(/\S+/g) || []).length;
}

const NEGACION = /\b(no|sin|ni|nunca|jamas|tampoco)\b/;
const CORTE_DE_CLAUSULA = /[,;:]|\b(y|pero|aunque|sino)\b/g;

/** Texto de la misma cláusula que precede a la posición `inicio` (máximo `ventana` caracteres). */
function previoEnClausula(norm, inicio, ventana) {
  const previo = norm.slice(Math.max(0, inicio - ventana), inicio);
  let corte = 0;
  for (const m of previo.matchAll(CORTE_DE_CLAUSULA)) corte = m.index + m[0].length;
  return previo.slice(corte);
}

/** true si lo que empieza en `inicio` está negado dentro de su cláusula ("sin velocidad", "no usa velocidad"). */
export function estaNegado(norm, inicio, ventana = 25) {
  return NEGACION.test(previoEnClausula(norm, inicio, ventana));
}

/** true si lo que empieza en `inicio` está dentro de un condicional ("si el rival no puede esquivar…"). */
export function esCondicional(norm, inicio, ventana = 40) {
  return /\b(si|en caso de que|de no)\b/.test(previoEnClausula(norm, inicio, ventana));
}

/** Conectores que indican que el texto explica el por qué o el cómo. */
export const JUSTIFICACION =
  /\b(porque|ya que|debido a|dado que|puesto que|pues|mediante|a traves de|gracias a|por medio de|lo que (le |me |te )?permite|por lo (tanto|que)|(ya no|no) depende|al [a-z]+(ar|er|ir)(se|lo|la|le|los|las)?)\b/;

/** La oración siguiente arranca explicando la anterior ("Esto se debe a…", "Ya que…"). */
const JUSTIFICA_LO_ANTERIOR = /^(esto|eso|lo anterior|ya que|porque|debido|dado que|puesto que|la razon|se debe|funciona porque)\b/;

export function estaJustificada(oraciones, indice) {
  if (JUSTIFICACION.test(oraciones[indice].norm)) return true;
  const siguiente = oraciones[indice + 1];
  return Boolean(siguiente && JUSTIFICA_LO_ANTERIOR.test(siguiente.norm));
}

/** Todas las coincidencias de `regex` en las oraciones, con la oración donde aparecen. */
export function buscar(oraciones, regex, { omitirNegadas = false, omitirCondicionales = false } = {}) {
  const global = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
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

export const MODALIDADES = ['simple', 'argumentativo', 'unlimited', 'lore'];

export const NOMBRE_MODALIDAD = {
  simple: 'Rol simple',
  argumentativo: 'BR argumentativo',
  unlimited: 'BR unlimited',
  lore: 'Lore Rol',
};

export function resumir(hallazgos) {
  const resumen = { grave: 0, advertencia: 0, sugerencia: 0 };
  for (const h of hallazgos) resumen[h.severidad] += 1;
  return resumen;
}

export function veredicto(resumen) {
  if (resumen.grave > 0) return 'Necesita correcciones';
  if (resumen.advertencia > 0) return 'Revisable: corrige las advertencias';
  return 'Bien encaminado';
}

const ORDEN_SEVERIDAD = { grave: 0, advertencia: 1, sugerencia: 2 };

export function ordenarPorSeveridad(hallazgos) {
  return [...hallazgos].sort((a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]);
}
