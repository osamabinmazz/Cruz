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

Mejoras: cada arma sube del nivel 1 al 3 (cuesta 30 y luego 60). Cada nivel mejora **a la vez** el daño (×1,3), el alcance (×1,1) y la rapidez (×0,88 de recarga). Las mejoras son definitivas. En el arma solo se ve el número de nivel (★★).

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

## 10. Estado de la implementación

- [x] Núcleo: mapas, noches, mejoras, estado del estudiante, equilibrio (pruebas).
- [ ] Zombis nuevos (saltador, doble, gigante).
- [ ] Tres desafíos y tres armas nuevas; elección de las 7 armas que se llevan.
- [ ] Modo clase por equipos y ranking.
- [ ] Interfaz de la campaña (estudiantes, noches, historia, repasos, taller, diploma).
- [ ] Paisajes por mapa.
- [ ] Panel del docente, exportación y Drive.
- [ ] Práctica y partida rápida en el menú.
- [ ] Música por noche, efectos nuevos y voz de Acrux.
- [ ] Publicación de las dos versiones.
