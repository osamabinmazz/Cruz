# Cruz del Sur: Defensa del Campamento — Documento de diseño

## 1. Propósito

Videojuego educativo en el que los jugadores aprenden un procedimiento para encontrar el **Sur aproximado** a partir de la Cruz del Sur:

1. **ENCONTRAR** la Cruz del Sur y su eje mayor (de Gacrux a Acrux).
2. **SEGUIR** la prolongación del eje mayor desde Acrux hasta un punto del cielo.
3. **BAJAR** desde ese punto hasta el horizonte: allí está el Sur aproximado.

Cada problema respondido correctamente desbloquea una defensa (un arma). Si la respuesta es incorrecta, el lugar de esa arma queda vacío en el mapa. Con las armas obtenidas, el jugador protege el campamento de tres oleadas de zombis caricaturescos.

## 2. Principio general

Todos los jugadores:

- Resuelven exactamente los mismos siete problemas, en el mismo orden.
- Reciben las mismas consignas y ven las mismas representaciones de la Cruz del Sur.
- Disponen de las mismas opciones de respuesta.
- Pueden desbloquear las mismas siete defensas, siempre en el mismo orden y con las mismas reglas.
- Construyen el mismo procedimiento y llegan a la misma síntesis conceptual.

No existen preguntas especiales, recorridos reducidos ni actividades diferentes según el jugador. Ningún nivel pide mediciones del eje: la prolongación termina en un punto del cielo ya marcado y desde allí se baja al horizonte.

## 3. Flujo de la partida

```
MENÚ → COMENZAR → ELIGE TU NIVEL → TU MISIÓN → (demostración, solo Principiante)
     → 7 desafíos → síntesis → batalla (3 oleadas) → pantalla final
```

- La pantalla **ELIGE TU NIVEL** es obligatoria cada vez que se comienza o se reinicia.
- El nivel se guarda para toda la partida. Solo cambia al **reiniciar la partida** o al **volver al menú**.
- La batalla solo comienza después de responder los siete problemas.

### 3.1 Pantalla de misión

Después de elegir el nivel se anticipa lo que va a pasar. La pantalla **TU MISIÓN** cuenta que los zombis vienen hacia el campamento y muestra un mapa con los siete lugares vacíos que esperan su arma. Las reglas:

1. Resolverás 7 desafíos sobre la Cruz del Sur, siempre en el mismo orden.
2. Cada desafío tiene **un solo intento**.
3. Si respondes correctamente, desbloqueas un arma y se coloca en su lugar del mapa.
4. Si te equivocas, verás la respuesta correcta, pero **ese lugar del mapa quedará vacío** durante la batalla.
5. Después llegarán 3 oleadas de zombis; si uno llega al campamento, podrás intentar detenerlo con una pregunta de emergencia.

### 3.2 Un solo intento por desafío

- La regla es igual en ambos niveles: el primer error hace perder el arma de ese desafío.
- Tras un error se marca en rojo la opción elegida, en verde la correcta, se muestra la respuesta correcta con su explicación y un aviso de que el lugar quedará vacío. Luego se pasa al siguiente desafío.
- El indicador de progreso marca cada desafío con ✓ (arma ganada) o ✕ (lugar vacío).
- En la síntesis se muestra el mapa con los lugares ocupados y vacíos. En la batalla, los lugares vacíos aparecen como pedestales sin arma; al tocarlos se lee «Lugar vacío».
- La dificultad de la batalla no cambia según las armas perdidas. Simulaciones sin usar los rescates: en Principiante se gana aun perdiendo 4 armas; en Avanzado se gana perdiendo hasta 1 arma, y con 2 o más perdidas hacen falta rescates exitosos o reintentar la batalla.

## 4. Selección de nivel

| | PRINCIPIANTE | AVANZADO |
|---|---|---|
| Descripción | Los mismos desafíos, con más pistas y una batalla más tranquila. | Los mismos desafíos, con menos ayudas y una batalla más intensa. |

Botón de información: *“Los dos niveles enseñan el mismo procedimiento y presentan los mismos siete problemas. Solo cambia la cantidad de ayuda y la dificultad de la batalla”.*

## 5. Los siete problemas (idénticos en ambos niveles)

| # | Paso | Problema | Respuesta correcta | Defensa (arma) |
|---|---|---|---|---|
| 1 | ENCONTRAR | Reconocer la Cruz del Sur entre tres grupos de estrellas | Grupo B | Torre Brillo (cañón) |
| 2 | ENCONTRAR | Seleccionar sus cuatro estrellas principales | Estrellas 2, 3, 5 y 7 | Cuarteto de Luz (torreta de 4 cañones) |
| 3 | ENCONTRAR | Identificar el eje mayor (palo largo) | Línea C | Lanza del Eje (ballesta) |
| 4 | ENCONTRAR | Colocar Gacrux y Acrux en los extremos correctos | Gacrux → B, Acrux → D | Gemelas Gacrux y Acrux (cañón doble) |
| 5 | SEGUIR | Elegir la prolongación correcta desde Acrux | Línea A | Guía Punteada (rayo que frena) |
| 6 | BAJAR | Bajar desde el extremo de la guía hasta el horizonte | Línea B | Plomada del Horizonte (catapulta) |
| 7 | BAJAR | Marcar la dirección Sur aproximada | Punto C | Brújula Austral (faro) |

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
- Las pistas se piden antes de responder y no cuentan como error.
- Un solo intento, sin límite de tiempo, botón para repetir la consigna.
- Con un solo intento ya no se retiran opciones equivocadas (el campo `removeWrongOption` se conserva en la configuración, pero no tiene efecto).
- Barra superior con los tres pasos: 1. ENCONTRAR, 2. SEGUIR, 3. BAJAR.

### 6.2 Avanzado — desafíos

- Sin demostración automática.
- Sin pistas: la pista se habilitaba tras dos errores, y con un solo intento nunca llega a estar disponible (el botón aparece deshabilitado).
- No hay resaltados automáticos, línea-guía normal.
- Retroalimentación breve.
- Un solo intento, sin límite de tiempo, mismas respuestas y estructura.

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

### 6.4 Armas de las defensas

Las defensas se ven como armas de caricatura estelar: se reconocen como armas, pero son de juguete, de colores, y disparan luz y estrellas.

| Defensa | Arma | Disparo |
|---|---|---|
| Torre Brillo | Cañón con ruedas | Bala de luz con estela |
| Cuarteto de Luz | Torreta de cuatro cañones | Cuatro balas pequeñas |
| Lanza del Eje | Ballesta de largo alcance | Flecha de luz |
| Gemelas Gacrux y Acrux | Cañón doble | Dos balas (anaranjada y blanca) |
| Guía Punteada | Antena con rayo | Rayos punteados que frenan |
| Plomada del Horizonte | Catapulta | Piedra estelar que alcanza a un grupo |
| Brújula Austral | Faro | Haz de luz que revela la niebla |

Las armas giran hacia su objetivo, retroceden y muestran un destello al disparar. Los mismos dibujos aparecen en la batalla, en la tarjeta de defensa desbloqueada, en la síntesis, en la leyenda y en la pantalla final. El Héroe Austral sigue sin armas.

Los zombis son personajes de caricatura con un estilo de dibujo animado propio: piel gris verdosa, ojos desiguales, boca abierta con dos dientes, brazos estirados hacia adelante y paso torpe que se anima al caminar. Al ser derrotados caen de espaldas y desaparecen en destellos, sin sangre, heridas ni restos.

| Tipo | Aspecto |
|---|---|
| Común | Saco marrón, camisa blanca y corbata roja |
| Veloz | Camiseta deportiva amarilla con el número 7, vincha y zapatillas; corre inclinado |
| Resistente | Cono de tránsito en la cabeza, que se ladea cuando pierde resistencia |
| De niebla | Capa con capucha, semitransparente y rodeado de bruma (solo visible de cerca, salvo que la Brújula Austral lo revele) |
| Con mochila | Explorador con una olla como casco y una mochila grande; la olla se abolla cuando pierde resistencia |

Los zombis giran con el camino: de perfil en los tramos horizontales, de frente cuando bajan y de espaldas cuando suben.

### 6.5 Escenario y sonido de la batalla

- **Cielo que gira:** la franja de cielo ocupa la parte superior del mapa y se parece a un cielo real: cientos de estrellas de distinto brillo y color, la Vía Láctea con la mancha oscura del Saco de Carbón junto a la Cruz del Sur y dos estrellas muy brillantes cerca de la cruz. Todo gira lentamente en sentido horario alrededor del polo sur celeste (una vuelta cada 3 minutos de batalla), como se ve al mirar hacia el Sur. No hay nombres, líneas, guías ni marca del Sur: la Cruz del Sur se reconoce por su forma y su brillo, como en el cielo verdadero. El cielo se detiene cuando el combate está pausado.
- **Escenario:** luna; colinas y pinos en el horizonte; césped a cuadros con pasto, flores, arbustos, rocas y pinos; camino de tierra con huellas y piedritas; campamento con cerco y entrada, carpas, fogata animada, farol, tronco y bandera con la Cruz del Sur que flamea; luciérnagas.
- **Nombres de las defensas:** no se muestran sobre el campo para no tapar el juego. Aparecen en un cartel al tocar una defensa o al pasar el puntero; la leyenda debajo del campo los muestra siempre.
- **Sonido:** cada arma tiene su efecto (estruendo del cañón, ráfaga de la torreta, cuerda de la ballesta, doble estruendo, zumbido del rayo, silbido de la catapulta y destello del faro), con límites para no saturar. Los zombis emiten un quejido cómico al caer. La música de batalla suma capas en cada oleada: bajo y platillos; luego batería y acordes; por último la melodía.

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
| **HÉROE AUSTRAL** | Fácil (3 opciones) | Una estrella de la Cruz del Sur baja del cielo, derrota al zombi detenido y al siguiente más cercano al final del camino. Si no hay otro, derrota solo al primero y vuelve al cielo. No queda como defensa. |

**Héroes estrella.** Los héroes son las cuatro estrellas principales de la Cruz del Sur, cada una con su color: Acrux, Mimosa, Gacrux y Delta. Cada rescate con héroe llama a la siguiente, en ese orden, así que en una batalla nunca se repite. La tarjeta del premio anticipa qué estrella bajará. Cada héroe es una estrella con cara, capa azul y el escudo con la Cruz del Sur, sin armas.

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
- Bomba correcta: estrella sonriente que crece con rayos giratorios y chispas, cuenta 3‑2‑1 en un globo, ondas luminosas de colores con estrellas despedidas y zombis que desaparecen en destellos justo cuando la onda los alcanza.
- Héroe correcto: su estrella se apaga en el cielo y baja con una estela de luz hasta el campamento; mira siempre hacia su objetivo, levanta el escudo con un golpe de energía (anillo, rayos y estrella), se desplaza al siguiente zombi, lo derrota y, saludando, vuelve a su lugar en la Cruz del Sur, que se enciende otra vez.
- Respuesta incorrecta: sonido suave, explicación y música que vuelve gradualmente.

## 8. Pantallas comunes

- Etiqueta permanente **NIVEL: PRINCIPIANTE** / **NIVEL: AVANZADO**.
- Menú de pausa: **CONTINUAR**, **REINICIAR PARTIDA**, **VOLVER AL MENÚ**. La dificultad no se puede cambiar desde la pausa.
- Pantalla final: *“Completaste el recorrido en nivel Principiante/Avanzado”*, desafíos completados, respuestas correctas, intentos, pistas, zombis detenidos, energía restante, las defensas obtenidas y los lugares que quedaron vacíos, y el resumen de rescates (activados, bombas, héroes, correctas, incorrectas, zombis eliminados por bombas y por héroes, daño evitado). No hay clasificaciones ni comparaciones entre jugadores.
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
