# Voz de Acrux (gratuita, sin internet)

Las frases de Acrux están pregrabadas como audios MP3 en `public/voz/`. Se generaron con **Kokoro**, un modelo de voz
gratuito y de código abierto (licencia Apache-2.0) que suena mucho más natural que los sintetizadores clásicos, usando la
voz en español **«ef_dora»** (mujer). Solo se publican los audios resultantes, no el programa ni el modelo.

- El botón **VOZ** del juego la activa o desactiva (viene desactivada).
- Funciona sin internet: en el `.zip` los audios van en la carpeta `voz`, junto al archivo del juego.
- Si falta un audio, el juego usa la voz que traiga el navegador.

## Cambiar o agregar frases

1. Edita `src/ui/acruxLines.json` (todas las frases de Acrux están ahí).
2. Instala una vez: `python3 -m venv /tmp/voz && /tmp/voz/bin/pip install kokoro-onnx lameenc numpy`
3. Baja `kokoro-v1.0.onnx` y `voices-v1.0.bin` de
   <https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0>
4. Ejecuta: `/tmp/voz/bin/python scripts/generar-voz.py kokoro-v1.0.onnx voices-v1.0.bin ef_dora`
   (otras voces en español: `em_alex`, `em_santa`).

Una prueba automática avisa si alguna frase del juego no tiene su audio.
