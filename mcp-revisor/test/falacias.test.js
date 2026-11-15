import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarFalacias } from '../src/falacias.js';

const reglas = (texto, opciones) => revisarFalacias(texto, opciones).hallazgos.map((h) => h.regla);
const hallazgo = (texto, regla, opciones) => revisarFalacias(texto, opciones).hallazgos.find((h) => h.regla === regla);

test('auto-nerf temporal: dice no depender del tiempo y usa velocidad', () => {
  const h = hallazgo('Mi personaje no depende del tiempo y ataca a una velocidad de mach 50.', 'auto_nerf_temporal');
  assert.ok(h);
  assert.equal(h.severidad, 'grave');
});

test('auto-nerf temporal: la velocidad negada no cuenta', () => {
  assert.ok(!reglas('Su ataque es atemporal: no usa velocidad, existe como condición.').includes('auto_nerf_temporal'));
});

test('auto-nerf espacial: aespacial pero se acerca', () => {
  assert.ok(reglas('Mi personaje es aespacial. Se acerca al rival y lo corta.').includes('auto_nerf_espacial'));
});

test('contradicción conceptual: trasciende los conceptos pero actúa mediante un concepto', () => {
  const texto = 'Mi existencia trasciende los conceptos. Ataco mediante el concepto de muerte.';
  assert.ok(reglas(texto).includes('contradiccion_conceptual'));
});

test('intangible que golpea, salvo que explique cómo se vuelve tangible', () => {
  assert.ok(reglas('Es intangible ante todo. Luego lo golpea con su puño.').includes('intangible_con_contacto'));
  assert.ok(
    !reglas('Es intangible, pero vuelve tangible solo su puño al impactar. Lo golpea con su puño.').includes(
      'intangible_con_contacto',
    ),
  );
});

test('apelación al poder del personaje', () => {
  assert.ok(reglas('Bloqueo el golpe porque soy más fuerte.').includes('autoridad_del_personaje'));
  assert.ok(reglas('No le hace nada porque es dios.').includes('autoridad_del_personaje'));
});

test('"superior al nivel X" es jerarquía, no autoridad', () => {
  assert.ok(!reglas('Lo anula al ser superior al nivel conceptual del ataque.').includes('autoridad_del_personaje'));
});

test('autohit: grave sin justificación, sugerencia con justificación', () => {
  assert.equal(hallazgo('El rayo es imposible de esquivar.', 'autohit').severidad, 'grave');
  const justificado = hallazgo('Es inesquivable porque ocurre en todos los puntos del espacio a la vez.', 'autohit');
  assert.equal(justificado.severidad, 'sugerencia');
});

test('autohit: un condicional no es autohit', () => {
  assert.ok(!reglas('Si el rival no puede esquivar, el corte lo alcanza.').includes('autohit'));
});

test('tankeo sin justificación, y con justificación en la oración siguiente', () => {
  assert.ok(reglas('Su ataque no me afecta.').includes('negacion_sin_justificacion'));
  assert.ok(
    !reglas('Su ataque no me afecta. Esto se debe a que mi cuerpo ya no ocupa una coordenada definida.').includes(
      'negacion_sin_justificacion',
    ),
  );
});

test('trascendencia: sin mecanismo se marca, con mecanismo no', () => {
  assert.ok(reglas('Makima trasciende el platonismo.').includes('trascendencia_sin_mecanismo'));
  assert.ok(
    !reglas('Makima trasciende el platonismo porque su existencia ya no depende de Formas.').includes(
      'trascendencia_sin_mecanismo',
    ),
  );
});

test('efecto absoluto: "borra todo" se marca, si especifica no', () => {
  assert.ok(reglas('Mi técnica borra todo.').includes('efecto_absoluto_sin_especificar'));
  assert.ok(
    !reglas('Mi técnica borra todo: su regeneración, sus pasivas y su anclaje.').includes(
      'efecto_absoluto_sin_especificar',
    ),
  );
  assert.ok(!reglas('Destruye todo su cuerpo.').includes('efecto_absoluto_sin_especificar'));
});

test('circularidad', () => {
  assert.ok(reglas('Es indestructible porque no puede ser destruido.').includes('circularidad'));
  assert.ok(reglas('Es invencible porque nadie lo puede vencer.').includes('circularidad'));
  assert.ok(!reglas('Es inmune al tiempo porque existe fuera del flujo causal.').includes('circularidad'));
});

test('justificación vacía', () => {
  assert.ok(reglas('Lo anula porque sí.').includes('justificacion_vacia'));
  assert.ok(!reglas('Lo anula porque si el rival depende de su Forma, la pierde.').includes('justificacion_vacia'));
});

test('infinito sin definir se reporta una sola vez', () => {
  const r = revisarFalacias('Tiene poder infinito. Su energía es infinita. Su alcance es infinito.');
  const hs = r.hallazgos.filter((h) => h.regla === 'hiperbole_sin_definir');
  assert.equal(hs.length, 1);
  assert.match(hs[0].detalle, /3 veces/);
});

test('FTL sin justificación', () => {
  assert.ok(reglas('Corre más rápido que la luz hacia el rival.').includes('ftl_sin_justificacion'));
});

test('en lore todo baja a sugerencia', () => {
  const r = revisarFalacias('Bloqueo el golpe porque soy más fuerte. El rayo es imposible de esquivar.', {
    modalidad: 'lore',
  });
  assert.ok(r.hallazgos.length >= 2);
  assert.ok(r.hallazgos.every((h) => h.severidad === 'sugerencia'));
  assert.match(r.revision_manual[0], /Lore Rol/);
});

test('un texto bien construido no tiene graves', () => {
  const texto =
    'Makima concentra su voluntad y lanza una adjudicación desde el Uno. Al actuar desde el Uno, el ataque ' +
    'apunta a la participación del rival en el Nous: anula la Forma que sostiene su regeneración, porque esa ' +
    'pasiva depende de una Idea que emana de un nivel inferior. Si impacta, el rival pierde su regeneración.';
  const r = revisarFalacias(texto);
  assert.equal(r.resumen.grave, 0);
  assert.equal(r.veredicto, 'Bien encaminado');
});

test('hallazgos ordenados de más a menos grave', () => {
  const r = revisarFalacias('Tiene poder infinito. Bloqueo el golpe porque soy más fuerte.');
  const orden = r.hallazgos.map((h) => h.severidad);
  assert.deepEqual(orden, [...orden].sort((a, b) => ['grave', 'advertencia', 'sugerencia'].indexOf(a) - ['grave', 'advertencia', 'sugerencia'].indexOf(b)));
});

test('"anula todos los conceptos posibles" (ejemplo de la guía) no es efecto absoluto', () => {
  assert.ok(!reglas('Su ataque anula todos los conceptos posibles y ataca la raíz ontológica.').includes('efecto_absoluto_sin_especificar'));
});

test('"por lo que" es consecuencia, no explica cómo se trasciende ni por qué no se puede esquivar', () => {
  const r = revisarFalacias('Makima trasciende el tiempo, por lo que el rival no puede esquivar.');
  assert.ok(r.hallazgos.some((h) => h.regla === 'trascendencia_sin_mecanismo'));
  assert.equal(r.hallazgos.find((h) => h.regla === 'autohit').severidad, 'grave');
});
