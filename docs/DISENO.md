# Cruz del Sur: Defensa del Campamento — Documento de diseño

## 1. Propósito

Videojuego educativo en el que los jugadores aprenden un procedimiento para encontrar el **Sur aproximado** a partir de la Cruz del Sur:

1. **ENCONTRAR** la Cruz del Sur y su eje mayor (de Gacrux a Acrux).
2. **SEGUIR** la prolongación del eje mayor desde Acrux hasta un punto del cielo.
3. **BAJAR** desde ese punto hasta el horizonte: allí está el Sur aproximado.

Cada problema resuelto desbloquea una defensa. Con las siete defensas, el jugador protege el campamento de tres oleadas de zombis caricaturescos.

## 2. Principio general

Todos los jugadores:

- Resuelven exactamente los mismos siete problemas, en el mismo orden.
- Reciben las mismas consignas y ven las mismas representaciones de la Cruz del Sur.
- Disponen de las mismas opciones de respuesta.
- Desbloquean las mismas siete defensas.
- Construyen el mismo procedimiento y llegan a la misma síntesis conceptual.

No existen preguntas especiales, recorridos reducidos ni actividades diferentes según el jugador. Ningún nivel pide mediciones del eje: la prolongación termina en un punto del cielo ya marcado y desde allí se baja al horizonte.

## 3. Flujo de la partida

```
MENÚ → COMENZAR → ELIGE TU NIVEL → (demostración, solo Principiante)
     → 7 desafíos → síntesis → batalla (3 oleadas) → pantalla final
```

- La pantalla **ELIGE TU NIVEL** es obligatoria cada vez que se comienza o se reinicia.
- El nivel se guarda para toda la partida. Solo cambia al **reiniciar la partida** o al **volver al menú**.
- La batalla solo comienza después de resolver los siete problemas.

## 4. Selección de nivel

| | PRINCIPIANTE | AVANZADO |
|---|---|---|
| Descripción | Los mismos desafíos, con más pistas y una batalla más tranquila. | Los mismos desafíos, con menos ayudas y una batalla más intensa. |

Botón de información: *“Los dos niveles enseñan el mismo procedimiento y presentan los mismos siete problemas. Solo cambia la cantidad de ayuda y la dificultad de la batalla”.*

## 5. Los siete problemas (idénticos en ambos niveles)

| # | Paso | Problema | Respuesta correcta | Defensa |
|---|---|---|---|---|
| 1 | ENCONTRAR | Reconocer la Cruz del Sur entre tres grupos de estrellas | Grupo B | Torre Brillo |
| 2 | ENCONTRAR | Seleccionar sus cuatro estrellas principales | Estrellas 2, 3, 5 y 7 | Cuarteto de Luz |
| 3 | ENCONTRAR | Identificar el eje mayor (palo largo) | Línea C | Lanza del Eje |
| 4 | ENCONTRAR | Colocar Gacrux y Acrux en los extremos correctos | Gacrux → B, Acrux → D | Gemelas Gacrux y Acrux |
| 5 | SEGUIR | Elegir la prolongación correcta desde Acrux | Línea A | Guía Punteada |
| 6 | BAJAR | Bajar desde el extremo de la guía hasta el horizonte | Línea B | Plomada del Horizonte |
| 7 | BAJAR | Marcar la dirección Sur aproximada | Punto C | Brújula Austral |

Los datos están en `src/core/challenges.ts` y existe **una sola lista**. El mismo `ChallengeManager` la carga para ambos niveles.

## 6. Configuración centralizada de dificultad

`src/core/difficulty.ts` define `Difficulty`, `DifficultyConfig` y `difficultyConfigs`. Los campos pedidos conservan los valores recomendados:

| Campo | Principiante | Avanzado |
|---|---|---|
| `hintsAvailableFromStart` | `true` | `false` |
| `hintsAfterWrongAttempts` | `0` | `2` |
| `removeWrongOption` | `true` | `false` |
| `guidedHighlights` | `true` | `false` |
| `introductoryDemonstration` | `true` | `false` |
| `enemySpeedMultiplier` | `0.8` | `1` |
| `enemyHealthMultiplier` | `0.8` | `1` |
| `towerReloadMultiplier` | `0.85` | `1` |
| `baseHealth` | `150` | `100` |
| `totalEnemies` | `18` | `24` |
| `wavePauseSeconds` | `8` | `4` |

Campos complementarios del mismo objeto: nombre del nivel, estilo de retroalimentación (explicativa o breve), barra ENCONTRAR / SEGUIR / BAJAR, intensidad de la línea-guía, animación del eje mayor, avisos de oleada, intervalo de aparición, resistencia extra del zombi con mochila y composición de las oleadas.

La configuración **solo** controla: presentación de pistas, resaltados, retroalimentación, velocidad y resistencia de los enemigos, recarga de las defensas, energía de la base, cantidad de zombis y pausas entre oleadas.

### 6.1 Principiante — desafíos

- Demostración breve antes del primer desafío.
- Indicador de progreso de siete pasos siempre visible.
- Botón **PISTA** desde el comienzo, con pistas ilimitadas; la pista resalta el elemento señalado.
- Animación que recuerda qué significa “eje mayor” (desafío 3).
- Acrux señalado visualmente cuando la consigna comienza desde esa estrella (desafío 5).
- Línea-guía punteada con mayor intensidad.
- Retroalimentación explicativa.
- Tras una respuesta incorrecta se retira temporalmente una opción equivocada (hasta terminar ese desafío; siempre quedan las correctas y al menos una equivocada).
- Intentos ilimitados, sin límite de tiempo, botón para repetir la consigna.
- Barra superior con los tres pasos: 1. ENCONTRAR, 2. SEGUIR, 3. BAJAR.

### 6.2 Avanzado — desafíos

- Sin demostración automática.
- Botón **PISTA** habilitado después de dos intentos incorrectos en el desafío.
- No se retiran opciones, no hay resaltados automáticos, línea-guía normal.
- Retroalimentación breve.
- Intentos ilimitados, sin límite de tiempo, mismas respuestas y estructura.

### 6.3 Batalla

| | Principiante | Avanzado |
|---|---|---|
| Velocidad de los zombis | 80 % | 100 % |
| Resistencia de los zombis | 80 % | 100 % |
| Recarga de las defensas | 15 % más rápida | normal |
| Energía del campamento | 150 | 100 |
| Zombis | 18 (5 + 6 + 7) | 24 (7 + 8 + 9) |
| Pausa entre oleadas | 8 s, con aviso previo | 4 s |
| Tercera oleada | incluye niebla y mochila | combina los cinco tipos |
| Zombi con mochila final | resistencia normal | resistencia adicional (× 1,6) |

Tipos de zombi: común, veloz, resistente, de niebla (solo visible de cerca, salvo que la Brújula Austral lo revele) y con mochila. Son personajes caricaturescos: al ser derrotados desaparecen en destellos, sin sangre ni restos.

El equilibrio se verifica con simulaciones en `tests/difficulty.test.ts`: con las siete defensas y aun fallando todas las preguntas de rescate, Principiante termina con al menos el 80 % de energía y Avanzado se gana con menos energía restante.

## 7. Mecánica de rescate: pregunta de emergencia

### 7.1 Activación

Cuando el **primer zombi de una oleada** llega a la entrada del campamento:

1. Se pausa el combate y se congelan zombis, proyectiles, ataques y temporizadores.
2. El zombi queda detenido antes de causar daño.
3. El campo se oscurece y aparece **“¡UN ZOMBI ATRAVESÓ LAS DEFENSAS!”** con el mensaje *“Puedes intentar detenerlo respondiendo una pregunta”*.
4. El jugador elige el premio **antes** de ver la pregunta y no puede cambiarlo después.

| Premio | Pregunta | Efecto si acierta |
|---|---|---|
| **BOMBA ESTELAR** | Difícil (3–4 opciones) | Elimina a todos los zombis que están en el campo, incluido el detenido. No afecta a los que todavía no ingresaron ni a oleadas futuras, ni daña defensas o campamento. |
| **HÉROE AUSTRAL** | Fácil (3 opciones) | Derrota al zombi detenido y al siguiente más cercano al final del camino. Si no hay otro, derrota solo al primero y se retira. No queda como defensa. |

### 7.2 Respuesta incorrecta

Se muestra **“ESTA VEZ NO”**, la respuesta correcta y una explicación de una oración. No hay segundo intento: el zombi causa su daño, el combate se reanuda y el rescate de esa oleada queda utilizado. Si la energía llega a cero se activa la derrota.

### 7.3 Límite

Estado por oleada (`WaveRescueState` en `src/core/battle/Battle.ts`):

```ts
interface WaveRescueState {
  waveNumber: number;
  rescueTriggered: boolean;
  selectedReward: "bomb" | "hero" | null;
  questionId: string | null;
  answeredCorrectly: boolean | null;
}
```

Se reinicia al comenzar cada oleada. Una vez usado, los zombis siguientes de la oleada dañan la base directamente. Con tres oleadas, el rescate aparece como máximo tres veces por partida.

### 7.4 Banco de preguntas

`src/core/rescue/questions.ts` contiene un único banco (siete fáciles y siete difíciles) compartido por ambos niveles. Solo trata contenidos del juego: reconocimiento de la Cruz del Sur, sus cuatro estrellas, eje mayor, Gacrux, Acrux, prolongación, proyección al horizonte, Sur aproximado, diferencia entre apuntar directamente y seguir la prolongación, y orden del procedimiento. Las preguntas se eligen al azar dentro de su categoría y no se repiten durante la partida. El orden de las opciones se mezcla al presentarlas.

### 7.5 Interfaz, sonido y animación

- La ventana muestra oleada, premio, nivel de la pregunta (FÁCIL / DIFÍCIL), pregunta, imagen cuando corresponde, opciones grandes, botón CONFIRMAR y el aviso *“Solo tienes un intento”*. No hay cronómetro.
- Al activarse: alerta breve, música atenuada, campo detenido y oscurecido.
- Bomba correcta: estrella creciente, cuenta 3‑2‑1, onda luminosa y zombis que desaparecen en destellos.
- Héroe correcto: aparece junto al campamento, detiene al zombi con un destello de energía, se desplaza al siguiente, lo derrota y se retira saludando.
- Respuesta incorrecta: sonido suave, explicación y música que vuelve gradualmente.

## 8. Pantallas comunes

- Etiqueta permanente **NIVEL: PRINCIPIANTE** / **NIVEL: AVANZADO**.
- Menú de pausa: **CONTINUAR**, **REINICIAR PARTIDA**, **VOLVER AL MENÚ**. La dificultad no se puede cambiar desde la pausa.
- Pantalla final: *“Completaste el recorrido en nivel Principiante/Avanzado”*, desafíos completados, intentos, pistas, zombis detenidos, energía restante, las siete defensas y el resumen de rescates (activados, bombas, héroes, correctas, incorrectas, zombis eliminados por bombas y por héroes, daño evitado). No hay clasificaciones ni comparaciones entre jugadores.
- “Daño evitado” suma la energía que habría quitado cada zombi detenido cuyo rescate fue exitoso.

## 9. Diseño general claro para todos

- Botones grandes y fáciles de reconocer, textos visibles.
- Interacción táctil y con ratón (cada elemento de la escena también tiene su botón).
- Sonido configurable y lectura de la consigna con el botón REPETIR CONSIGNA.
- Pantalla completa.
- Interfaz ordenada y consignas claras.
- Sin sangre ni violencia realista.

## 10. Arquitectura

```
src/core/            Lógica pura (sin DOM), cubierta por pruebas
  difficulty.ts      Configuración centralizada de los niveles
  challenges.ts      Los siete desafíos (lista única)
  ChallengeManager.ts
  defenses.ts        Las siete defensas
  battle/            Simulación de la batalla y estado de rescate por oleada
  rescue/            Banco de preguntas y controlador del rescate
  Game.ts            Máquina de estados de la partida
src/ui/              Pantallas DOM, escenas SVG, lienzo de la batalla, sonido
tests/               Pruebas automáticas (Vitest)
```

## 11. Pruebas

`npm test` ejecuta las pruebas que verifican, entre otras cosas:

- Elección obligatoria de nivel; mismos siete desafíos, respuestas, opciones y orden de defensas.
- Ayudas de Principiante desde el comienzo; pista de Avanzado tras dos errores.
- Zombis más lentos y débiles en Principiante; batalla más intensa en Avanzado.
- Dificultad bloqueada sin reiniciar; nivel en la pantalla final; síntesis común; batalla solo tras los siete problemas.
- Ausencia de mediciones del eje y de contenidos ajenos al diseño general.
- Las 23 comprobaciones de la mecánica de rescate (activación, pausa total, elección previa, categorías, efectos de bomba y héroe, respuesta incorrecta, límite por oleada, preguntas sin repetir, reanudación sin bloqueos, derrota).
