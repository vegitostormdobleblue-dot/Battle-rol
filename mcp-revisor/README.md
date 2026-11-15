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

Hace falta Node.js 18 o más nuevo. El servidor **no tiene dependencias**: `npm install` solo
hace falta para correr los tests y generar el archivo de Cloudflare.

```bash
cd mcp-revisor
npm install
```

```bash
npm test
```

## Usarlo en tu computadora (stdio)

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

## Publicarlo en Cloudflare Workers

Así queda como conector en claude.ai (web, escritorio y móvil). El Worker es gratuito dentro del
plan Free de Cloudflare y no guarda nada: cada pedido se revisa y se responde.

### Opción A: desde el panel, pegando un archivo

1. Entra a Cloudflare, ve a **Workers & Pages → Create** y empieza con la plantilla *Hello World*. Ponle de nombre `br-revisor` y pulsa **Deploy**.
2. Pulsa **Edit code**, borra todo el contenido de `worker.js` y pega el de
   [`cloudflare/br-revisor-worker.js`](cloudflare/br-revisor-worker.js) completo.
3. Pulsa **Deploy**.
4. Abre `https://br-revisor.<tu-subdominio>.workers.dev/` en el navegador. Tiene que mostrar
   "Revisor de Battle Rol" y la URL del conector.

### Opción B: con la CLI (wrangler)

```bash
cd mcp-revisor
```

```bash
npx wrangler login
```

```bash
npx wrangler deploy
```

`wrangler.toml` ya apunta a `cloudflare/worker.js`. Para probarlo en local antes de subirlo:
`npx wrangler dev`, que queda en `http://localhost:8787/mcp`.

### Agregarlo como conector en claude.ai

1. Ve a <https://claude.ai/customize/connectors> y pulsa **Add custom connector**.
2. Nombre: `br-revisor`. URL: `https://br-revisor.<tu-subdominio>.workers.dev/mcp`. Tiene que terminar en `/mcp`.
3. Guárdalo y actívalo en el chat (o empieza una sesión nueva de Claude Code en la nube: los conectores se leen al iniciar).

> El endpoint es público y no pide login: cualquiera que tenga la URL puede usar el revisor.
> Como solo lee el texto que le mandan y no guarda nada, el único riesgo es que alguien gaste tu
> cuota gratuita de Workers (100 000 pedidos al día).

### Si cambias las reglas

Edita `src/` y regenera el archivo para el panel:

```bash
npm run build:worker
```

Los tests fallan si `cloudflare/br-revisor-worker.js` quedó desactualizado respecto de `src/`.
Después vuelve a pegarlo en el panel (opción A) o corre `npx wrangler deploy` (opción B).

## Estructura

```
src/
  contenido.js     revisor de contenido
  falacias.js      revisor de falacias
  formato.js       informe en Markdown
  texto.js         normalización, oraciones y ayudantes compartidos
  herramientas.js  definición de las dos herramientas (esquemas y validación)
  protocolo.js     protocolo MCP (JSON-RPC), compartido por stdio y Cloudflare
  server.js        transporte stdio (Claude Code / Claude Desktop)
cloudflare/
  worker.js              transporte HTTP para Workers (lo usa wrangler)
  br-revisor-worker.js   lo mismo en un solo archivo, para pegar en el panel (generado)
scripts/construir-worker.mjs   genera br-revisor-worker.js
wrangler.toml                  configuración para `npx wrangler deploy`
test/                          tests con node:test y el cliente MCP oficial
```

Para agregar una falacia nueva, suma un objeto al arreglo `REGLAS` de `src/falacias.js` (con `id`,
`nombre`, `severidad` por modalidad, `explicacion`, `correccion` y `detectar`) y un test en
`test/falacias.test.js`.
