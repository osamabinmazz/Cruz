# Cruz del Sur 2.0: La Campaña de las Noches

Decisiones de diseño acordadas con el docente. La 1.0 sigue disponible aparte; la 2.0 es la versión principal.

## 1. Idea general

La 1.0 era una sola partida (siete desafíos y una batalla). La 2.0 es una **campaña de cinco noches**: cada noche trae sus desafíos, una batalla en un mapa distinto y un paso por el **taller estelar** para mejorar las armas. Cada estudiante tiene su propia campaña, y el docente ve los resultados en un panel.

Se mantiene todo lo esencial de la 1.0: los siete problemas idénticos en ambos niveles, un solo intento por desafío, preguntas de emergencia (Bomba Estelar y Héroe Austral), héroes estrella, sin sangre y en español.

## 2. Las cinco noches

| Noche | Mapa | Paso | Desafíos nuevos | Zombi nuevo |
|---|---|---|---|---|
| 1 | El bosque | ENCONTRAR | 1 y 2 | — |
| 2 | El río | ENCONTRAR | 3 y 4 | — |
| 3 | La colina | SEGUIR | 5 | Zombi saltador |
| 4 | El lago | BAJAR | 6 y 7 | Zombi doble |
| 5 | El campamento | REPASO FINAL | ninguno | Zombi gigante (jefe) |

- Las primeras noches son más suaves (menos vida y velocidad de los zombis). Las oleadas crecen: 2, 2, 3, 3 y 4.
- Cada zombi nuevo se presenta con **una tarjeta al empezar la noche** (dibujo y cómo detenerlo).
- Entre noche y noche, **Acrux cuenta una escena corta** (globo de diálogo) sobre lo que pasó y lo que viene.
- Los cuatro héroes estrella están disponibles desde el principio, como en la 1.0.

## 3. Errores, repasos y derrotas

- **Un solo intento por desafío**. Si el estudiante se equivoca, ve la respuesta correcta y el lugar de esa arma queda vacío esa noche.
- **Repaso**: en cada noche siguiente, el desafío fallado reaparece (el mismo problema, con las mismas opciones) antes de los desafíos nuevos. Si acierta, recupera el arma. Si falla, vuelve a aparecer la noche siguiente, hasta el final de la campaña.
- **Noche 5**: solo trae repasos de armas perdidas. Quien acertó todo va directo a la batalla final.
- **Derrota**: repite la misma noche (vuelve a colocar las armas y reintenta, sin repetir desafíos) y recibe un poco de polvo estelar de consuelo.
- Las noches ganadas no se repiten. Para practicar está el modo práctica.
- El nivel (Principiante o Avanzado) se elige al crear al estudiante y no cambia.

## 4. Polvo estelar y taller

Fuentes de polvo: respuesta correcta (10), repaso acertado (15), zombi detenido (1, hasta 30 por noche), ganar la noche (20; 5 de consuelo al perder) y rescate acertado (10).

Puestos de guardianes: se convocan en orden por 25, 40 y 60 de polvo (decisión provisional del autor, a confirmar). Mejoras: cada arma sube del nivel 1 al 3 (cuesta 30 y luego 60). Cada nivel mejora **a la vez** el daño (×1,3), el alcance (×1,1) y la rapidez (×0,88 de recarga). Las mejoras son definitivas. En el arma solo se ve el número de nivel (★★).

El taller muestra una tarjeta por arma con su nivel, lo que mejora, el costo y el botón MEJORAR. Las armas perdidas se ven apagadas con "se recupera en un repaso".

## 5. Estudiantes y docente

- **Estudiantes**: al tocar CAMPAÑA aparecen los nombres guardados en tarjetas y un botón "Nuevo estudiante" (nombre o apodo y nivel). Todo queda guardado solo en ese aparato.
- **Pasar la campaña a otro equipo**: "Guardar mi campaña" baja un archivo; "Cargar campaña" lo recupera.
- **Panel del docente** (botón discreto en el menú, con PIN de 4 dígitos y código de recuperación):
  - tabla de estudiantes por desafío (acierto, error o recuperado);
  - qué desafíos falló más el curso;
  - avance por noche;
  - preguntas de emergencia usadas y acertadas.
- **Exportar**: subida directa a Google Drive. Requiere un ID de cliente de Google (público, no secreto) que el docente pega una sola vez en el panel; la guía está en `docs/DRIVE.md`. Se agrega además la descarga de CSV como respaldo.
- **Diploma** al ganar la noche 5: nombre, fecha, medallas y estadísticas de la campaña, para imprimir o guardar en PDF.

## 6. Modo práctica y partida rápida

- **Práctica**: los siete desafíos sin batalla, con pistas ilimitadas, se puede errar y reintentar. No se registra en el panel ni toca la campaña.
- **Partida rápida**: la partida completa de la 1.0 en una sesión.
- Menú principal: CAMPAÑA, PARTIDA RÁPIDA, PRÁCTICA y Panel del docente.

## 7. Presentación

- Cinco mapas con paisaje propio (pinos y luciérnagas en el bosque, agua y puentes en el río, rocas en la colina, agua y juncos con niebla en el lago, carpas en el campamento).
- Inicio de cada noche: lista simple de noches (las futuras bloqueadas).
- Colocación de armas: tocar arma y lugar, y también arrastrar y soltar.
- Música con el mismo motivo y distinto tono por noche (cada vez más tensa). Sonidos propios al ganar polvo y al mejorar un arma.
- Voz de Acrux grabada con ElevenLabs (frases fijas, incluidas en el juego); el botón "Repetir consigna" sigue usando la voz del navegador.

## 8. Publicación

- 2.0 en la dirección principal; 1.0 en `/1.0/`.
- Dos descargas para jugar sin internet: una de cada versión.

## 9. Ampliaciones (segunda ronda de decisiones)

Lo que dice esta sección prevalece sobre las anteriores.

**Duración.** Cada noche dura unos 5 minutos: menos zombis por oleada que en el diseño inicial (se vuelve a equilibrar con simulaciones).

**Tres desafíos nuevos sobre la Cruz del Sur**, uno en cada una de las noches 2, 3 y 4. Con ellos son **10 desafíos** y **10 armas**.

| Noche | Desafío nuevo | Arma nueva |
|---|---|---|
| 2 | El tamaño del eje mayor | Regla de luz: rayo en línea recta que atraviesa a todos los zombis alineados |
| 3 | Seguir la prolongación con nubes (algunas estrellas no se ven) | Faro de vía láctea: haz que gira y quema a todos los que cruza |
| 4 | Ordenar los tres pasos con un ejemplo nuevo | Bumer de plata: golpea, vuelve y daña dos veces |

**Siete lugares, diez armas.** Cada mapa sigue teniendo 7 lugares y el estudiante **elige cuáles armas llevar** antes de la batalla (colocación y elección en la misma pantalla). Equivocarse en un desafío hace que **esa arma no se gane** (no que se pierda un lugar); el repaso la recupera. Las mejoras y el polvo estelar funcionan igual.

**Modo clase por equipos con turnos.** Para proyector o pizarra: el docente escribe de 2 a 6 equipos (nombre y color). Cada equipo responde un desafío por turno y suma polvo estelar para el curso. Letra grande y sin límite de tiempo.

**Ranking con nombres.** Se rankea por polvo estelar total, desafíos acertados al primer intento y noches ganadas, y lo ven los estudiantes. *Cambia un principio de la 1.0 (medallas personales, sin comparar).* Se mantiene que las medallas siguen siendo personales y que el ranking no muestra errores individuales.

## 10. Guardianes en el camino (estilo Kingdom Rush)

Además de las armas, la campaña tiene **puestos de guardianes**: pequeñas estrellas con escudo y espada de luz, parientes de los héroes estrella.

- **Qué hacen:** cada puesto envía **2 estrellitas** al camino. Un zombi que llega hasta ellas se detiene y pelea cuerpo a cuerpo hasta que uno cae; mientras tanto las armas le disparan. El zombi **veloz** se escabulle el 30 % de las veces y sigue.
- **Dónde se colocan:** en **los mismos 7 lugares que las armas** (hay que decidir qué va en cada uno). Hasta 3 puestos a la vez. El puesto queda junto al camino y sus estrellitas se paran en su **punto de reunión**: se toca el puesto y luego un punto cercano del camino, también durante la batalla.
- **Cómo se consiguen:** se convocan con polvo estelar en el taller y se mejoran como las armas (niveles 1 a 3, costos 30 y 60; cada nivel da más vida, más daño y recuperación más rápida).
- **Cuando una estrellita cae:** hay que volver a convocarla con polvo estelar (3 por estrellita), tomado del polvo guardado. Si no alcanza, el puesto queda apagado hasta el final de la noche.
- **Partida rápida:** queda como la 1.0, sin guardianes.

## 11. Mejoras gráficas

Estilo: **el mismo de caricatura, más pulido** (contornos oscuros, colores vivos, sombras suaves). Se mejoran las cuatro áreas: zombis y guardianes, armas, paisajes y pantallas.

- **Zombis:** caminar con balanceo de cabeza y brazos; pelear cuerpo a cuerpo con los guardianes (golpes, retroceso, destellos); reaccionar al daño (parpadeo, cara de sorpresa, tambaleo); caer de forma graciosa soltando estrellitas y un sombrerito, sin sangre.
- **Guardianes:** el aspecto cambia con el nivel (nivel 1 simple; nivel 2 capa de color; nivel 3 aura estelar y espada con luz).
- **Armas y disparos:** más definición y animación al disparar, con chispas, humo y partículas en los impactos según el arma. En las armas mejoradas solo se ve el número de nivel (★★).
- **Efectos de combate:** barra de vida sobre cada zombi y temblor leve de pantalla con la Bomba Estelar y el jefe. Sin números de daño flotantes.
- **Paisajes:** agua que se mueve (ondas y reflejos de estrellas) en el río y el lago, árboles y pasto que se mecen, más luciérnagas y estrellas fugaces. Cada mapa cambia el tono de la noche.
- **Amanecer:** al ganar la noche 5, el cielo se aclara con el amanecer.
- **Pantallas y botones:** marcos de madera con estrellas doradas, como letreros de campamento, en el menú, el taller, la historia, el panel y los botones.

## 12. Rutas de los mapas

- **Bifurcaciones:** la noche 1 tiene un solo camino. Desde la noche 2 el camino se divide en dos rutas que vuelven a unirse antes del campamento (río con isla, colina que se rodea por arriba o por abajo, lago que se rodea por el norte o por el sur, y en la noche final un atajo que evita la vuelta larga). Los zombis se reparten por turnos entre las dos rutas, que tienen largos distintos.
- **Guardianes y rutas:** los guardianes frenan a todo zombi que pase junto a ellos, sea de la ruta que sea; en los tramos que las dos rutas comparten frenan a los de las dos. Al mover el punto de reunión se puede pasar de una ruta a la otra.
- **Curvas suaves:** las esquinas están redondeadas, así que los zombis giran poco a poco.
- **Aspecto:** tierra con bordes de piedras y huellas de carreta, flechas que indican hacia dónde caminan los zombis, una puerta de piedra con luz verde por donde entran, agua (río y lago) y puentes de madera donde una ruta cruza el río.
- **Lugares de las armas:** se recalcularon para cubrir las dos rutas según el alcance de cada arma, lejos del agua y sin apretarse.
- **Partida rápida:** conserva el mapa y el camino de la 1.0.

## 13. Terreno y armas (segunda pasada gráfica)

- **Relieve y profundidad:** lomas con luz y sombra, sombras largas bajo armas y adornos (la luz de la luna viene de arriba a la izquierda), brillo de luna sobre el suelo y borde oscuro del campo.
- **Texturas y variedad:** manchas de tierra, arena, barro u hojas según el mapa, pasto más denso; pinos, robles, árboles secos, troncos caídos, hongos (que brillan en el bosque y el lago), cañas en las orillas, columnas en ruinas en la colina y flores. Cada mapa tiene sus proporciones.
- **Clima distinto por mapa:** luciérnagas y un búho en el bosque, lluvia fina en el río, niebla en el lago, viento con hojas y un murciélago en la colina, humo en el campamento.
- **Lo que se mueve:** agua con ondas, reflejos de estrellas y peces que saltan; árboles y pasto que se mecen; humo de la fogata.
- **Bases de las armas:** plataformas de piedra con runas que brillan del color del arma. En las armas mejoradas se suma un borde dorado y las estrellas del nivel; el nivel 3 tiene además un aura.
- **Armas:** más grandes (escala 1,6), se aplastan un poco al disparar, sueltan humo y chispas, titilan y muestran el círculo de alcance al tocarlas o señalarlas. Los disparos tienen estelas y chispas más vistosas. Los sonidos de cada arma ganaron capas (chasquido, estruendo, retumbar y eco).

## 14. Más acción: el estudiante hace, no solo mira

**Preguntas**
- **Desafíos con acción:** el desafío 3 (eje mayor) pasa a **trazar la línea con el dedo** y el 7 (marcar el Sur) a **tocar el punto en el horizonte**, sin letras A, B, C. Se comprueba con tolerancia amplia y después se superpone la línea correcta para comparar. Los demás desafíos mantienen las opciones múltiples, y el desafío 4 (nombres en los extremos) ya es de arrastrar. Los textos de los desafíos no cambian.
- **Preguntas de emergencia:** formatos activos (ordenar los tres pasos, tocar la estrella correcta en el cielo, marcar el punto del Sur) y **más preguntas** para que no se repitan en toda la campaña. No hay preguntas extra en medio de la batalla: quedan solo entre batallas y en la emergencia.

**En la batalla, en tiempo real**
- **Mejorar al instante:** tocar un arma o un puesto de guardianes y gastar el polvo estelar para subirlo de nivel en plena batalla. Es el mismo polvo del taller (una sola moneda).
- **Recoger polvo tocando:** cada zombi que cae suelta polvo estelar que hay que tocar antes de que se apague. (Con esto, el polvo de los zombis detenidos se gana recogiéndolo.)
- **Un poder de estrella a elección:** antes de cada noche el estudiante elige un solo poder con recarga: Rayo de Acrux (línea de daño), Escudo de Mimosa (cura y bloquea el próximo daño), Lluvia de Gacrux (estrellas en área) o Congelar de Delta (frena a todos).
- **Control del tiempo:** botón de acelerar x2 y botón de llamar la siguiente oleada antes (solo adelanta, sin premio).

## 15. La escuela reemplaza al campamento

- **Historia:** una noche de observación del cielo en la escuela. El curso se quedó a mirar las estrellas y los zombis llegan a la escuela; Acrux es la estrella guía.
- **En todo el juego** (campaña y partida rápida): el final del camino es la escuela y la energía se llama **energía de la escuela**.
- **Cómo se ve:** edificio con puerta, reloj, bandera y ventanas encendidas; estudiantes y el docente que se asoman y se asustan cuando llega un zombi (y celebran cuando se gana); patio con juegos y un pizarrón con la Cruz del Sur dibujada. Un timbre escolar suena cuando un zombi llega.
- **Mejoras:** con polvo estelar se refuerza la escuela (más energía). *Es parte del taller estelar.*

## 16. Estado de la implementación

- [x] Núcleo: mapas, noches, mejoras, estado del estudiante, equilibrio (pruebas).
- [x] Zombis nuevos en la simulación (saltador, doble, gigante); falta su dibujo definitivo.
- [x] Batalla activa: mejorar armas y guardianes con polvo, recoger polvo tocando, poder de estrella (4), velocidad x2, llamar la oleada.
- [x] La escuela reemplaza al campamento: edificio con ventanas encendidas, personas que se asoman, bandera, timbre al recibir daño, mejora de la escuela en el taller, selector de poder.
- [x] Modo extremo (10 estrellas) en el menú: difícil pero posible; cada derrota suaviza la siguiente partida (hasta 5 veces) y ganar vuelve a la dificultad completa.
- [ ] Desafíos activos (trazar eje mayor, tocar el punto Sur) y preguntas de emergencia activas.
- [ ] Tres desafíos y tres armas nuevas; elección de las 7 armas que se llevan.
- [ ] Modo clase por equipos y ranking.
- [x] Guardianes en la simulación y la campaña (combate, puestos, punto de reunión, reconvocar, mejorar, costos); falta la interfaz.
- [x] Interfaz de la campaña: estudiantes (guardar y cargar en archivo), noches, historia, repasos, taller, colocación eligiendo qué llevar, batalla con guardianes. Falta el diploma.
- [~] Paisajes por mapa: ya cambian el camino, los adornos y el tono; faltan agua y viento animados y el amanecer final.
- [ ] Pulido gráfico: zombis, guardianes, armas, efectos y pantallas de madera.
- [ ] Panel del docente, exportación y Drive.
- [ ] Práctica y partida rápida en el menú.
- [ ] Música por noche, efectos nuevos y voz de Acrux.
- [ ] Publicación de las dos versiones.
