// Genera cloudflare/br-revisor-worker.js: el Worker completo en un solo archivo, sin
// dependencias, listo para pegar en el editor del panel de Cloudflare.
//
//   npm run build:worker

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { generarGuias, SALIDA_GUIAS } from './generar-guias.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
export const SALIDA = fileURLToPath(new URL('../cloudflare/br-revisor-worker.js', import.meta.url));

const CABECERA = `// br-revisor: servidor MCP para revisar contenido y falacias de Battle Rol.
// ARCHIVO GENERADO con \`npm run build:worker\`: no lo edites a mano, edita src/ y cloudflare/worker.js.
//
// Cómo usarlo: en Cloudflare, Workers & Pages > Create > Worker > Edit code,
// reemplaza todo el contenido por este archivo y pulsa Deploy.
// El endpoint MCP queda en https://<tu-worker>.workers.dev/mcp
//
// Para activar el agente (revisar_a_fondo), en Settings > Variables and Secrets agrega dos secretos:
//   CLAVE_ACCESO       una clave larga; el endpoint pasa a ser /mcp/<CLAVE_ACCESO>
//   ANTHROPIC_API_KEY  tu API key de la Claude Console
// El código legible está en mcp-revisor/src y mcp-revisor/cloudflare/worker.js.
`;

/** Devuelve el código del Worker en un solo archivo. */
export async function construirWorker() {
  const resultado = await build({
    entryPoints: [fileURLToPath(new URL('../cloudflare/worker.js', import.meta.url))],
    absWorkingDir: raiz,
    bundle: true,
    format: 'esm',
    // 'browser' hace que el SDK de Anthropic use su versión sin módulos de Node (la que sirve en Workers).
    platform: 'browser',
    conditions: ['workerd', 'worker', 'browser'],
    target: 'es2022',
    legalComments: 'none',
    // Incluye el SDK de Anthropic: minificado pesa ~440 KB en vez de ~1,2 MB y se pega más fácil.
    minify: true,
    banner: { js: CABECERA },
    write: false,
    logLevel: 'silent',
  });
  return resultado.outputFiles[0].text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(SALIDA_GUIAS, await generarGuias());
  const codigo = await construirWorker();
  await writeFile(SALIDA, codigo);
  console.log(`Escrito ${SALIDA} (${(codigo.length / 1024).toFixed(1)} KB)`);
}
