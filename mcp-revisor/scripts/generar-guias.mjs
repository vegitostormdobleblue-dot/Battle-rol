// Genera src/guias.js con el texto de las guías de BR de la raíz del repo, para que el
// agente las reciba en su prompt también dentro de Cloudflare (allí no hay archivos que leer).
//
//   npm run build:guias   (lo corre también npm run build:worker)

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const GUIAS = ['Battle rol-1', 'Battle rol 2', 'Battle-rol 3', 'Battle-rol 4'];
export const SALIDA_GUIAS = fileURLToPath(new URL('../src/guias.js', import.meta.url));

export async function generarGuias() {
  const partes = await Promise.all(
    GUIAS.map(async (nombre) => {
      const texto = await readFile(new URL(`../../${nombre}`, import.meta.url), 'utf8');
      return `<guia nombre="${nombre}">\n${texto.trim()}\n</guia>`;
    }),
  );
  return (
    '// ARCHIVO GENERADO con `npm run build:guias` a partir de las guías de la raíz del repo. No lo edites a mano.\n\n' +
    `export const GUIAS_BR = ${JSON.stringify(partes.join('\n\n'))};\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(SALIDA_GUIAS, await generarGuias());
  console.log(`Escrito ${SALIDA_GUIAS}`);
}
