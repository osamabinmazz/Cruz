# Cruz del Sur 3.0 — «La Isla de las Noches» (diseño)

Respuestas del docente que definen esta versión (juego aparte en `/3.0/`; la 2.0 y la 1.0 siguen publicadas):

## Idea
Juego 3D en **tercera persona** con estética **tipo Roblox** (personajes y escenarios de bloques, colores vivos). El jugador
controla a un **estudiante de túnica blanca**. Los **zombis son los de la 2.0** (común, veloz, resistente, niebla, mochila,
saltador, doble, mini y gigante). Para **mejorar las armas** hay que **abrir cofres respondiendo preguntas de orientación**
(Cruz del Sur, Sol y puntos cardinales).

## Decisiones
| Tema | Decisión |
|---|---|
| Partida | Defender la escuela: oleadas de zombis hacia la escuela; el estudiante corre por el mapa con **2-3 armas en la mano** y también **coloca torres** (las de la 2.0) en lugares fijos junto al camino. |
| Aparatos | Computador (WASD + mouse) y tablet/celular (joystick virtual + botones). 3D liviano para equipos escolares. |
| Cofres | Repartidos por el mapa; también aparecen otros tras cada oleada. Te acercas, tocas **E** (o el botón) y respondes. Acierto: abre y mejoras un arma. Fallo: el cofre queda cerrado un rato y se puede reintentar. |
| Estilo | Bloques y colores vivos; cielo de día y de noche. |
| Zombis | Siguen el camino hacia la escuela; si el estudiante queda cerca, lo atacan/persiguen un trecho. Con 3 corazones: al caer, reaparece en la escuela tras unos segundos. |
| Preguntas | Cruz del Sur, el Sol (sombras, salida y puesta), puntos cardinales y brújula, y algunas **dentro del 3D** (mirar hacia el Sur con el personaje, etc.). |
| Mundo | Una **isla/pueblo** con la escuela al centro y zonas (bosque, río con puente, colina, lago) que cambian por noche. |
| Duración | **5 días y 5 noches**; la última con el gigante. De día: explorar, cofres (Sol y cardinales), mejorar. De noche: oleadas y Cruz del Sur. |
| Personaje | Túnica blanca fija; el estudiante elige **piel, pelo y un accesorio estelar**; nombre sobre la cabeza. |
| Niveles | Principiante, Avanzado y Extremo (como en la 2.0; el Extremo se suaviza tras cada derrota). |
| Avance | Estudiantes, panel del docente y diploma reutilizados de la 2.0. |

## Orientación del mundo
Norte = arriba del mapa (−z), Este = derecha (+x), Sur = abajo (+z), Oeste = izquierda (−x). La escuela queda al Este. El Sol
sale por el Este y se pone por el Oeste; de noche la Cruz del Sur se ve hacia el Sur.

## Cómo se construye
- Motor 3D: **Three.js** (empaquetado, funciona sin internet). Código en `src3d/`, página en `3.0/index.html`.
- La batalla reutiliza el simulador de la 2.0 (`src/core/battle`), con las coordenadas del campo (960 × 690) pasadas al
  mundo 3D (1 unidad = 10 del campo). La pregunta de emergencia se apaga (`rescue: false`): ahora las preguntas van en los cofres.
- Las preguntas de los cofres son un banco nuevo en `src/core/chests/`.

## Etapas (cada una se prueba y se envía como zip)
- [x] A. Mundo 3D de bloques, estudiante, cámara, controles (teclado y táctil), zombis de la 2.0, disparo, escuela con energía.
- [x] B. Cofres con preguntas y mejora de armas; banco de preguntas (Cruz del Sur, Sol, cardinales y «dentro del 3D»).
- [x] C. Torres colocables en pedestales, armería de 2-3 armas, ciclo día/noche (el Sol sale por el Este y se pone por el Oeste) y las 5 noches con el gigante en la última. Pendiente: que los zombis persigan al estudiante.
- [x] D. Personalización del estudiante (piel, pelo, color y extra con vista previa), niveles (el Extremo se suaviza tras cada derrota), estudiantes guardados que continúan su avance, panel del profesor (mismo PIN que la 2.0, tabla por estudiante, temas a reforzar, CSV, código para pasar un estudiante a otro aparato) y diploma en PDF.
- [x] E. Pulido: música distinta de día y de noche (se intensifica con las oleadas), pasos, sonidos de colocar torre, abrir cofre, amanecer y anochecer, enlace desde el menú de la 2.0 y versión sin conexión probada abriendo el archivo directamente.
- [ ] Publicación en `/3.0/` (PR, CI, Pages): solo cuando se pida.

## Cómo se juega (resumen)

1. Se elige o crea un estudiante (nombre, aspecto, nivel).
2. **Día** (90 s, se puede adelantar con N): el Sol cruza de Este a Oeste. Se ponen torres en los pedestales (E), se eligen 2 o 3 armas en la armería de la escuela (E) y se abren cofres con preguntas del Sol y los puntos cardinales.
3. **Noche**: oleadas de zombis que siguen el camino hacia la escuela. Las torres disparan solas y el estudiante dispara con auto-apuntado, esquiva (C) y recoge polvo estelar para curar la escuela. Los cofres preguntan sobre la Cruz del Sur y los puntos cardinales.
4. Cinco días y cinco noches; en la última llega el gigante. Al terminar se obtiene el diploma.
5. Los zombis cercanos se salen del camino un trecho para perseguir al estudiante (sin cambiar la simulación: el zombi sigue avanzando por su ruta). La escuela es un lugar seguro.

### Novedades de la versión pulida
- **Misiones de orientación** de día: «camina hacia el Oeste desde la escuela y encuentra la bandera» (a veces con el Sol: «hacia donde sale el Sol»). La bandera solo se ve de cerca. Dan una mejora.
- **Clima por noche:** despejada, niebla, tormenta (lluvia, rayos y truenos), luna roja y la gran noche. Las especiales traen un **cofre estelar** (hay que mirar hacia un punto cardinal) que da mejora y cura la escuela.
- **Aprendizaje:** más de 20 preguntas por tema, brújula táctil (tocar el punto cardinal, con la aguja girada) y resumen al final de cada noche con el tema a repasar.
- **Música propia** (un día y cinco noches, más intensa con las oleadas), lluvia, truenos y **voz de Acrux** opcional (voz del navegador si no hay audios).
- **Pausa y ajustes** (Esc o P): volumen, cámara, calidad gráfica, letra grande, disparo automático, menos movimiento y botones táctiles grandes. La calidad «automática» baja sola el detalle si el juego va lento.

