# Verificación de fichas

El usuario es Verificador de Fichas oficial de un servidor de battle rol en Discord. Se revisan fichas de personaje, NPC y actualizaciones con la skill `verificador-de-fichas` de este repo (`.claude/skills/verificador-de-fichas/SKILL.md`) y se escriben veredictos cortos listos para pegar. También se juzgan respuestas de autores, borradores del usuario y, a veces, intercambios de combate o debate.

Todo esto viene de la sesión "Servidor roleplay reglas" (repo `Prueba`, rama `ccr-566db361-yn35h3`), del 7 al 27 de octubre de 2026.

## Cómo se trabaja cada ficha

- No usar agentes. Solo la skill `verificador-de-fichas` de este repo.
- Un `think_low` (`mcp__sequential_thinking__think_low`, cargarlo con ToolSearch si hace falta) por cada habilidad, con el análisis de esa habilidad, antes del veredicto. Si el usuario pide `think_max`, usar ese.
- Contar los caracteres con bash (`wc -m`) y dividir el mensaje si pasa de 2.000 (límite de Discord).
- Sin bloques de código en los veredictos.
- Estilo técnico-directo, sin preámbulos, lenguaje llano.
- Como máximo una recomendación opcional por veredicto.
- Cuando el usuario lo pida, buscar en Superpower Wiki y en VS Battles (powerscaling).

## Reglas fijas del usuario

- No editar la skill salvo que el usuario lo pida expresamente.
- Nunca decir "techo". Nunca decir "ticket": decir "canal de la ficha", aunque la skill diga "ticket".
- "Lo que digo no tiene que ser absoluto, recuerda que solo recomendamos."
- No poner límites numéricos ni porcentajes propios salvo que lo pidan.
- No reescribir las habilidades del autor. Si el usuario da sus cambios, escribir solo lo que el autor tiene que cambiar con esos cambios y lo que el autor puso, sin proponer arreglos propios.
- Todo tiene que poder contrarrestarse; anti god-rol estricto.
- Los nombres solos no importan.
- No contradecir en público a otro verificador.
- Respetar las decisiones del usuario y no volver a discutirlas. El servidor es narrativo, así que se aceptan duraciones narrativas.
- Si una habilidad es solo un nombre o es demasiado simple, es un cambio obligatorio, no una recomendación: decir exactamente qué tiene que especificar.
- Un límite tiene que limitar de verdad. Un viaje temporal que permite ir y volver al mismo combate no está limitado.

## Reglas del owner

- "Admitimos energía infinita pero no poder infinito." Para un personaje con energía infinita, un costo de energía no es límite: pedir una condición, un rango u otro costo.

## Conceptos

- Prohibidas (Rechazada): divino, primordial, conceptual, meta, causalidad, alteración de la realidad, ontología y fichas de broma.
- Limitadas: adaptación, espacio-tiempo, probabilidad, fuerzas fundamentales (los agujeros negros con límites severos), daño existencial parcial e inmunidades.
- Topes: 10,000°, 1,100,000 V y -200°.
- Escalas: Continental y la velocidad de la luz son el máximo. Fuerza/resistencia y velocidad son escalas separadas.
- TD y CD (incluido contar turnos) no cuentan como límite.
- Mano negra, mano blanca, god-mod (usar habilidades que no están en la ficha, "sacar cosas de la nada") y meta-rol: 1 warn cada uno.
- En combate solo cuenta lo que está escrito en la ficha.
- BFR (Battle Field Removal) es un resultado o una condición de victoria, no un poder. Un BFR inevitable es mano negra.
- Inmortalidad tipo 8 de VS Battles: inmortalidad dependiente (de algo externo o de un concepto).
- Mettle of Man (Dead by Daylight): ignora el siguiente golpe que lo derribaría, después de 3 golpes de protección.

## Precedentes

- Inmunidad física: pasa a ser resistencia (Hsin, Morgan).
- Control de seres vivos: necesita una condición o una resistencia (Hormigas). Toque más velocidad lenta cuenta como condición (Big Mom, toque y velocidad subsónica).
- Regeneración: necesita un punto de falla (Rodan, Hakari).
- Agujero negro: área definida y carga visible (Yuki); para Ash se aceptó el tamaño de un estadio.
- Porcentajes: sirven como reducción (Late, Zero).
- Viaje temporal: "si lo usa, sale del combate" (Ash). Bardock: de ida en combate, no puede llevarse al rival y la detección de anomalías es solo percepción.

## Errores que no hay que repetir

- Hinatsuru: se aprobó con "describir las habilidades" como recomendación. Era un cambio obligatorio.
- Bardock: concentración más costo de ki seguía permitiendo ir y volver al combate. Tiene que ser de ida.
- Big Mom: se marcó el control de alma por no tener resistencia. Toque más velocidad subsónica ya es counter: Aprobada.
- Ash: se propusieron arreglos propios cuando el usuario quería solo sus cambios.
- Debate Goku contra Dark Knight: An 悟 es el jugador de Goku; "Son Goku" con el avatar de Linterna Verde es el jugador de Dark Knight. El borrado conceptual era un ataque de Dark Knight, no de Goku.

## Estado al 27 de octubre de 2026

Cerradas como Aprobada: Hakari, actualización de fuego, Meliodas, Rayan (NPC), Natsumi, Hazfru, Ash, Cyber-Elf X (NPC), Grippy y Big Mom.

Pendientes:

- Hinatsuru, tercera versión. Faltan dos cosas: la Respiración Lunar dice que hay 16 técnicas pero no describe ninguna (qué hace cada una de las que va a usar, alcance y costo), y la katana transformada no dice hasta dónde se alarga. Pasan el Mundo Transparente, las cuchillas lunares (el "más daño" sin número no frena) y la regeneración demoníaca (punto de falla: el cuello). Veredicto probable: Aprobada con cambios.
- Bardock: el anillo del tiempo tiene que ser de ida en combate y aclarar que no se lleva al rival. La versión con recarga de "6 turnos" no pasa.
- Esperando a los autores: Late, Kenjaku, Arashi, Yuki, Zero, Morgan, Hsin y Rodan.
