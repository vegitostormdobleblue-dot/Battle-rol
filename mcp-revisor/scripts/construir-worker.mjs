// Genera cloudflare/br-revisor-worker.js: el Worker completo en un solo archivo, sin
// dependencias, listo para pegar en el editor del panel de Cloudflare.
//
//   npm run build:worker

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const raiz = fileURLToPath(new URL('..', import.meta.url));
export const SALIDA = fileURLToPath(new URL('../cloudflare/br-revisor-worker.js', import.meta.url));

const CABECERA = `// br-revisor: servidor MCP para revisar contenido y falacias de Battle Rol.
// ARCHIVO GENERADO con \`npm run build:worker\`: no lo edites a mano, edita src/ y cloudflare/worker.js.
//
// Cómo usarlo: en Cloudflare, Workers & Pages > Create > Worker > Edit code,
// reemplaza todo el contenido por este archivo y pulsa Deploy.
// El endpoint MCP queda en https://<tu-worker>.workers.dev/mcp
`;

/** Devuelve el código del Worker en un solo archivo. */
export async function construirWorker() {
  const resultado = await build({
    entryPoints: [fileURLToPath(new URL('../cloudflare/worker.js', import.meta.url))],
    absWorkingDir: raiz,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    legalComments: 'none',
    banner: { js: CABECERA },
    write: false,
    logLevel: 'silent',
  });
  return resultado.outputFiles[0].text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const codigo = await construirWorker();
  await writeFile(SALIDA, codigo);
  console.log(`Escrito ${SALIDA} (${(codigo.length / 1024).toFixed(1)} KB)`);
}
