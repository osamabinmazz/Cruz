# Cruz del Sur: Defensa del Campamento

Juego educativo de la Cruz del Sur. Los jugadores resuelven siete desafíos para aprender a encontrar el **Sur aproximado** (ENCONTRAR → SEGUIR → BAJAR). Cada desafío desbloquea una defensa, y con las siete defienden el campamento de tres oleadas de zombis.

- Dos niveles, **Principiante** y **Avanzado**, con los mismos siete problemas. Solo cambian la cantidad de ayuda y la dificultad de la batalla.
- **Pregunta de emergencia**: cuando el primer zombi de una oleada llega al campamento, el jugador puede elegir la *Bomba Estelar* (pregunta difícil) o el *Héroe Austral* (pregunta fácil).

El diseño completo está en [`docs/DISENO.md`](docs/DISENO.md).

## Jugar

- **En internet:** https://osamabinmazz.github.io/Cruz/ (se actualiza sola con cada cambio en `main`).
- **Sin internet:** en el menú del juego está el enlace *Descargar para jugar sin internet*. Descarga `cruz-del-sur.zip`; al descomprimirlo, basta abrir `cruz-del-sur.html` con cualquier navegador.

Funciona en computador, tablet, teléfono (mejor en horizontal durante la batalla) y proyector.

### Activar la página (una sola vez)

En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Después, cada vez que se une un cambio a `main`, el flujo `Pruebas y publicación` corre las pruebas, arma el juego y lo publica. En cada pull request solo corre las pruebas y la compilación.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # pruebas automáticas
npm run build     # versión para publicar (carpeta dist/, incluye cruz-del-sur.zip)
```
