# Cruz del Sur: Defensa del Campamento

Juego educativo de la Cruz del Sur. Los jugadores resuelven siete desafíos para aprender a encontrar el **Sur aproximado** (ENCONTRAR → SEGUIR → BAJAR). Cada desafío desbloquea una defensa, y con las siete defienden el campamento de tres oleadas de zombis.

- Dos niveles, **Principiante** y **Avanzado**, con los mismos siete problemas. Solo cambian la cantidad de ayuda y la dificultad de la batalla.
- **Pregunta de emergencia**: cuando el primer zombi de una oleada llega al campamento, el jugador puede elegir la *Bomba Estelar* (pregunta difícil) o el *Héroe Austral* (pregunta fácil).

El diseño completo está en [`docs/DISENO.md`](docs/DISENO.md).

## Uso

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # pruebas automáticas
npm run build     # versión para publicar (carpeta dist/)
```

El resultado de `npm run build` es un sitio estático: funciona en cualquier servidor web, con ratón o pantalla táctil.
