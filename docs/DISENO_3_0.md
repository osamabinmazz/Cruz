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
- [ ] A. Mundo 3D de bloques, estudiante, cámara, controles (teclado y táctil), zombis de la 2.0, disparo, escuela con energía.
- [ ] B. Cofres con preguntas y mejora de armas; banco de preguntas (Cruz del Sur, Sol, cardinales y «dentro del 3D»).
- [ ] C. Torres colocables, 2-3 armas del estudiante, ciclo día/noche y las 5 noches con el gigante.
- [ ] D. Personalización, niveles, estudiantes guardados, panel del docente y diploma.
- [ ] E. Pulido, música, sonidos, zip sin conexión y publicación en `/3.0/`.
