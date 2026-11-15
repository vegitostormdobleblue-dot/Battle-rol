#!/usr/bin/env node
// Servidor MCP "br-revisor": revisa textos de Battle Rol.
// Tiene un único propósito y dos herramientas: revisar_contenido y revisar_falacias.

import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { revisarContenido } from './contenido.js';
import { revisarFalacias } from './falacias.js';
import { formatearContenido, formatearFalacias } from './formato.js';
import { MODALIDADES } from './texto.js';

const texto = z
  .string()
  .trim()
  .min(1, 'El texto no puede estar vacío.')
  .max(20000, 'El texto es demasiado largo (máximo 20 000 caracteres).')
  .describe('El texto de BR a revisar, tal como se va a mandar (ataque, defensa, habilidad o debunk).');

const modalidad = z
  .enum(MODALIDADES)
  .default('argumentativo')
  .describe(
    'Modalidad del BR: "simple" (corto y directo), "argumentativo" (filosofía, física o lógica), ' +
      '"unlimited" (sin techo de poder) o "lore" (prioriza la historia; las falacias se permiten).',
  );

const severidad = z.enum(['grave', 'advertencia', 'sugerencia']);

const hallazgo = z.object({
  regla: z.string(),
  nombre: z.string(),
  severidad,
  fragmentos: z.array(z.string()),
  explicacion: z.string(),
  correccion: z.string(),
  detalle: z.string().optional(),
});

const resumen = z.object({ grave: z.number(), advertencia: z.number(), sugerencia: z.number() });

const salidaComun = {
  modalidad: z.enum(MODALIDADES),
  veredicto: z.string(),
  resumen,
  hallazgos: z.array(hallazgo),
  revision_manual: z.array(z.string()),
};

const ANOTACIONES = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

export function crearServidor() {
  const server = new McpServer({ name: 'br-revisor', version: '1.0.0' });

  server.registerTool(
    'revisar_contenido',
    {
      title: 'Revisar contenido de BR',
      description:
        'Revisa un ataque, una defensa o una habilidad de Battle Rol contra las guías del servidor: ' +
        'estructura Inicio / Núcleo / Consecuencia, si explica el cómo y el por qué, qué le rompe al rival, ' +
        'límites (alcance, duración, requisitos, contraindicaciones) y qué marco lo sostiene (física, platonismo, ' +
        'neoplatonismo…). La revisión es por patrones: después completa los puntos de "revision_manual" con tu propio criterio.',
      inputSchema: {
        texto,
        modalidad,
        tipo: z
          .enum(['ataque', 'defensa', 'habilidad'])
          .default('ataque')
          .describe('Qué es el texto. Las defensas se evalúan contra el ataque que reciben.'),
      },
      outputSchema: {
        revisor: z.literal('contenido'),
        ...salidaComun,
        tipo: z.enum(['ataque', 'defensa', 'habilidad']),
        palabras: z.number(),
        estructura: z.object({ inicio: z.boolean(), nucleo: z.boolean(), consecuencia: z.boolean() }),
        formula: z.object({
          accion: z.boolean(),
          como_y_por_que: z.boolean(),
          que_rompe: z.boolean(),
          efecto: z.boolean(),
          limitacion: z.boolean(),
        }),
        limites: z.object({
          alcance: z.boolean(),
          duracion: z.boolean(),
          requisitos: z.boolean(),
          contraindicaciones: z.boolean(),
        }),
        marcos_detectados: z.array(z.string()),
      },
      annotations: ANOTACIONES,
    },
    async ({ texto, modalidad, tipo }) => {
      const resultado = revisarContenido(texto, { modalidad, tipo });
      return {
        content: [{ type: 'text', text: formatearContenido(resultado) }],
        structuredContent: resultado,
      };
    },
  );

  server.registerTool(
    'revisar_falacias',
    {
      title: 'Revisar falacias de BR',
      description:
        'Busca falacias y auto-nerfs en un texto de Battle Rol: auto-nerf temporal o espacial, contradicción ' +
        'de nivel conceptual, "lo bloquea porque es más fuerte", autohit ("no puede esquivar"), tankeo sin ' +
        'justificar, trascendencia sin mecanismo, "borra todo" sin especificar, razonamiento circular, ' +
        '"infinito" sin definir y FTL sin justificar. En modalidad "lore" todo baja a sugerencia porque ahí ' +
        'las falacias se permiten. La revisión es por patrones: completa los puntos de "revision_manual" con tu propio criterio.',
      inputSchema: { texto, modalidad },
      outputSchema: { revisor: z.literal('falacias'), ...salidaComun },
      annotations: ANOTACIONES,
    },
    async ({ texto, modalidad }) => {
      const resultado = revisarFalacias(texto, { modalidad });
      return {
        content: [{ type: 'text', text: formatearFalacias(resultado) }],
        structuredContent: resultado,
      };
    },
  );

  return server;
}

async function main() {
  const server = crearServidor();
  await server.connect(new StdioServerTransport());
  // stdout es del protocolo MCP: los mensajes para humanos van a stderr.
  console.error('br-revisor listo (stdio).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('br-revisor no pudo arrancar:', error);
    process.exit(1);
  });
}
