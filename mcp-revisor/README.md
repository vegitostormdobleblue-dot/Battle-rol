# br-revisor (MCP)

Servidor MCP con un único propósito: **revisar textos de Battle Rol** antes de mandarlos.
Las reglas salen de las guías de este repo (`Battle rol-1` a `Battle-rol 4`).

## Herramientas

### `revisar_contenido`

Revisa un ataque, una defensa o una habilidad:

- **Estructura**: Inicio (cómo se lanza), Núcleo (qué afecta) y Consecuencia (qué pasa si impacta).
- **Cómo y por qué**: si hay justificación ("porque", "ya que", "mediante", "al + verbo"…).
- **Qué le rompe al rival**: pasivas, regeneración, anclajes, raíz conceptual…
- **Límites**: alcance, duración, requisitos y contraindicaciones.
- **Marco**: física clásica, cuántica, relatividad, platonismo, neoplatonismo, ontología, causalidad…
- **Casos especiales**: neoplatonismo sin hipóstasis, y cuántica aplicada al cuerpo entero sin explicar cómo escala.

Parámetros: `texto`, `modalidad` (por defecto `argumentativo`) y `tipo` (`ataque`, `defensa` o `habilidad`; por defecto `ataque`).

### `revisar_falacias`

Busca falacias y auto-nerfs:

| Regla | Ejemplo que la dispara |
|---|---|
| Auto-nerf temporal | "No depende del tiempo… ataca a mach 50" |
| Auto-nerf espacial | "Es aespacial… se acerca al rival" |
| Contradicción conceptual | "Trasciende los conceptos… ataca mediante el concepto de muerte" |
| Intangible pero golpea | "Es intangible… lo golpea con su puño" |
| Apelación al poder del personaje | "Lo bloquea porque es más fuerte / porque es dios" |
| Justificación vacía | "Lo anula porque sí" |
| Autohit / control del rival | "Es imposible de esquivar" |
| Resultado impuesto | "Lo mata", "queda derrotado" (sin "si impacta…") |
| Tankeo sin justificación | "Su ataque no me afecta." |
| Trascendencia sin explicar | "Trasciende el platonismo." |
| Efecto absoluto sin especificar | "Borra todo." |
| Razonamiento circular | "Es indestructible porque no puede ser destruido" |
| Infinito u omnipotente sin definir | "Tiene poder infinito" |
| FTL sin justificar | "Corre más rápido que la luz" |

Parámetros: `texto` y `modalidad`.

### Modalidades

| Modalidad | Cómo cambia la revisión |
|---|---|
| `simple` | No pide justificación, límites ni marco teórico. Avisa si el texto es demasiado largo. |
| `argumentativo` | La más estricta: pide justificación, qué se rompe, límites y marco. |
| `unlimited` | Igual de estricta, pero el "infinito" sin definir baja a sugerencia. |
| `lore` | Las falacias se permiten: todo baja a sugerencia y el foco pasa a la coherencia con la historia. |

### Qué devuelve

Cada herramienta devuelve un informe en Markdown y los mismos datos en JSON (`structuredContent`):
veredicto, cuántos hallazgos hay de cada severidad (`grave`, `advertencia`, `sugerencia`), cada
hallazgo con la frase citada y cómo corregirla, y una lista de `revision_manual` con lo que la
revisión por patrones no puede juzgar sola: si el personaje tiene ese hax según su wiki, el escalado,
los hombres de paja…

> La revisión es por patrones (expresiones regulares sobre el texto sin tildes). Puede dar falsos
> positivos y no entiende el texto como una persona: sirve de primer filtro, no reemplaza a un verificador.

## Instalación

Hace falta Node.js 18 o más nuevo.

```bash
cd mcp-revisor
npm install
```

```bash
npm test
```

## Conectarlo

**Claude Code dentro de este repo:** el archivo `.mcp.json` de la raíz ya lo registra como
`br-revisor`. Claude Code lo detecta al abrir el repo y pide aprobarlo la primera vez.

**Claude Code en otra carpeta:**

```bash
claude mcp add br-revisor -- node /ruta/a/Battle-rol/mcp-revisor/src/server.js
```

**Claude Desktop:** agrega esto a `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "br-revisor": {
      "command": "node",
      "args": ["/ruta/a/Battle-rol/mcp-revisor/src/server.js"]
    }
  }
}
```

El servidor funciona por stdio, así que corre en la misma máquina que Claude. Para usarlo como
conector en claude.ai (web o móvil) tendría que estar publicado como servidor HTTP remoto, y eso
este paquete todavía no lo incluye.

## Estructura

```
src/
  server.js     registro de las dos herramientas MCP (stdio)
  contenido.js  revisor de contenido
  falacias.js   revisor de falacias
  formato.js    informe en Markdown
  texto.js      normalización, oraciones y ayudantes compartidos
test/           tests con node:test
```

Para agregar una falacia nueva, suma un objeto al arreglo `REGLAS` de `src/falacias.js` (con `id`,
`nombre`, `severidad` por modalidad, `explicacion`, `correccion` y `detectar`) y un test en
`test/falacias.test.js`.
