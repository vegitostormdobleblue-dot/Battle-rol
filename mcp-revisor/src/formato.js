// Convierte el resultado de un revisor en un informe Markdown legible en el chat.

import { NOMBRE_MODALIDAD } from './texto.js';

const ETIQUETA = { grave: 'GRAVE', advertencia: 'ADVERTENCIA', sugerencia: 'SUGERENCIA' };

function lineaResumen({ grave, advertencia, sugerencia }) {
  return `${grave} grave(s), ${advertencia} advertencia(s), ${sugerencia} sugerencia(s)`;
}

function bloqueHallazgos(hallazgos) {
  if (hallazgos.length === 0) return ['No se detectaron problemas por patrones.'];
  return hallazgos.flatMap((h, i) => {
    const lineas = [`${i + 1}. **[${ETIQUETA[h.severidad]}] ${h.nombre}**: ${h.explicacion}`];
    for (const f of h.fragmentos) lineas.push(`   > ${f}`);
    if (h.detalle) lineas.push(`   ${h.detalle}`);
    lineas.push(`   *Cómo corregirlo:* ${h.correccion}`);
    return lineas;
  });
}

const marca = (ok) => (ok ? '[x]' : '[ ]');

export function formatearFalacias(r) {
  return [
    `## Revisión de falacias · ${NOMBRE_MODALIDAD[r.modalidad]}`,
    `**Veredicto:** ${r.veredicto} (${lineaResumen(r.resumen)})`,
    '',
    '### Hallazgos',
    ...bloqueHallazgos(r.hallazgos),
    '',
    '### Para revisar a mano',
    ...r.revision_manual.map((p) => `- ${p}`),
    '',
    '_Revisión automática por patrones: puede dar falsos positivos y no reemplaza a un verificador._',
  ].join('\n');
}

export function formatearContenido(r) {
  const f = r.formula;
  // La fórmula de las guías es para argumentativo y unlimited; en simple y lore sería ruido.
  const conFormula = r.modalidad === 'argumentativo' || r.modalidad === 'unlimited';
  return [
    `## Revisión de contenido · ${NOMBRE_MODALIDAD[r.modalidad]} · ${r.tipo} (${r.palabras} palabras)`,
    `**Veredicto:** ${r.veredicto} (${lineaResumen(r.resumen)})`,
    '',
    ...(conFormula
      ? [
          '### Fórmula: acción + cómo + qué rompe + efecto + límite',
          `- ${marca(f.accion)} Acción (cómo se lanza)`,
          `- ${marca(f.como_y_por_que)} Cómo y por qué funciona`,
          `- ${marca(f.que_rompe)} ${r.tipo === 'defensa' ? 'Contra qué defiende' : 'Qué le rompe al rival'}`,
          `- ${marca(f.efecto)} Efecto / consecuencia`,
          `- ${marca(f.limitacion)} Condición o limitación`,
          '',
          `**Marcos detectados:** ${r.marcos_detectados.length ? r.marcos_detectados.join(', ') : 'ninguno'}`,
          '',
        ]
      : []),
    '### Hallazgos',
    ...bloqueHallazgos(r.hallazgos),
    '',
    '### Para revisar a mano',
    ...r.revision_manual.map((p) => `- ${p}`),
    '',
    '_Revisión automática por patrones: puede dar falsos positivos y no reemplaza a un verificador._',
  ].join('\n');
}
