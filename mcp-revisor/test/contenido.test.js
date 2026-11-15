import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarContenido } from '../src/contenido.js';

const reglas = (texto, opciones) => revisarContenido(texto, opciones).hallazgos.map((h) => h.regla);

const BUENO =
  'Makima concentra su voluntad y lanza una adjudicación desde el Uno, la causa primaria. Al actuar desde el ' +
  'Uno, el ataque no golpea el cuerpo del rival sino su participación en el Nous: anula la Forma que sostiene ' +
  'su regeneración, porque esa pasiva depende de una Idea que emana de un nivel inferior. Si impacta, el rival ' +
  'pierde su regeneración y su anclaje conceptual hasta que restaure su Fuente. Limitación: solo afecta a un ' +
  'objetivo y requiere que Makima mantenga la concentración durante la canalización; no funciona contra ' +
  'entidades sin participación manifiesta.';

test('un ataque argumentativo completo no tiene hallazgos', () => {
  const r = revisarContenido(BUENO);
  assert.deepEqual(r.hallazgos, []);
  assert.deepEqual(r.formula, { accion: true, como_y_por_que: true, que_rompe: true, efecto: true, limitacion: true });
  assert.ok(r.marcos_detectados.includes('neoplatonismo'));
});

test('texto demasiado corto es grave', () => {
  const r = revisarContenido('Lo mato.');
  assert.equal(r.hallazgos[0].regla, 'muy_corto');
  assert.equal(r.hallazgos[0].severidad, 'grave');
});

test('argumentativo sin justificación es grave', () => {
  const texto =
    'Lanza una esfera de energía oscura contra el rival. La esfera estalla sobre su cuerpo y destruye su ' +
    'regeneración. Solo afecta al objetivo durante un instante y requiere concentración total del usuario para ' +
    'mantener la forma de la esfera estable mientras viaja por el campo de batalla.';
  const h = revisarContenido(texto).hallazgos.find((x) => x.regla === 'sin_justificacion');
  assert.ok(h);
  assert.equal(h.severidad, 'grave');
});

test('rol simple: no pide justificación, límites ni fórmula', () => {
  const r = revisarContenido('Lo golpea y lo manda a la chucha', { modalidad: 'simple' });
  const ids = r.hallazgos.map((h) => h.regla);
  assert.ok(!ids.includes('sin_justificacion'));
  assert.ok(!ids.includes('sin_limites'));
  assert.equal(r.resumen.grave, 0);
  assert.equal(r.resumen.advertencia, 0);
});

test('rol simple largo recibe sugerencia', () => {
  const texto = Array.from({ length: 130 }, () => 'golpea').join(' ');
  assert.ok(reglas(texto, { modalidad: 'simple' }).includes('largo_para_simple'));
});

test('argumentativo sin marco teórico', () => {
  const texto =
    'Lanza una bola de fuego enorme contra el rival y lo quema entero, porque el fuego es muy caliente y ' +
    'el rival no aguanta tanto calor en su piel, así que termina muy herido y sin poder seguir peleando más.';
  assert.ok(reglas(texto).includes('sin_marco'));
});

test('neoplatonismo sin hipóstasis', () => {
  const texto =
    'Usando el neoplatonismo, Makima lanza una técnica que borra la existencia del rival porque todo emana ' +
    'de una fuente superior, lo que provoca que el rival deje de existir si impacta. Solo afecta a un objetivo.';
  assert.ok(reglas(texto).includes('neoplatonismo_sin_hipostasis'));
});

test('cuántica sin escala macroscópica', () => {
  const texto =
    'Al entrar en superposición cuántica, su cuerpo ya no depende de una sola posibilidad, lo que lo vuelve ' +
    'intangible ante cualquier ataque físico que busque impactar una coordenada definida del espacio-tiempo.';
  assert.ok(reglas(texto, { tipo: 'defensa' }).includes('cuantica_sin_escala'));
});

test('defensa: no pide efecto en el rival pero sí contra qué defiende', () => {
  const sinObjetivo = reglas('Cruza los brazos delante del pecho y se mantiene firme en su lugar.', {
    modalidad: 'simple',
    tipo: 'defensa',
  });
  assert.ok(sinObjetivo.includes('defensa_sin_objetivo'));
  assert.ok(!sinObjetivo.includes('sin_efecto_en_rival'));

  const conObjetivo = reglas('Bloquea el golpe con ambos brazos.', { modalidad: 'simple', tipo: 'defensa' });
  assert.ok(!conObjetivo.includes('defensa_sin_objetivo'));
});

test('límites: detecta qué categorías aparecen', () => {
  const r = revisarContenido(BUENO);
  assert.equal(r.limites.alcance, true);
  assert.equal(r.limites.requisitos, true);
  assert.equal(r.limites.contraindicaciones, true);
});
