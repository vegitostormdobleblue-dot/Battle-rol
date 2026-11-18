# Battle-rol

Guías de Battle Rol (BR): `Battle rol-1` a `Battle-rol 4`.

**Inicio de cada chat:** [`CLAUDE.md`](CLAUDE.md) tiene el recordatorio para cargar el proyecto «Battle rol»
(https://claude.ai/artifact/HSyBhhsfV7QYSdrYXUqMmV), sus instrucciones y el contexto. La copia del proyecto está en [`proyecto/`](proyecto/).

## MCP revisor

[`mcp-revisor/`](mcp-revisor/) es un servidor MCP con un único propósito: revisar textos de BR.
Tiene dos herramientas, `revisar_contenido` y `revisar_falacias`. Corre en tu computadora (stdio) o
en Cloudflare Workers como conector de claude.ai: el archivo para pegar en el panel es
[`mcp-revisor/cloudflare/br-revisor-worker.js`](mcp-revisor/cloudflare/br-revisor-worker.js).
Instalación y uso en su [README](mcp-revisor/README.md).
