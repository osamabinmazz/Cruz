# Voz de Acrux (gratuita, sin internet)

Las frases de Acrux están pregrabadas como audios MP3 en `public/voz/`. Se generaron con **Piper**, un sintetizador de voz
gratuito y de código abierto, usando la voz en español de México **«claude» (calidad alta, licencia Apache-2.0)** del
repositorio `rhasspy/piper-voices`. Solo se publican los audios resultantes, no el programa ni el modelo.

- El botón **VOZ** del juego la activa o desactiva (viene desactivada).
- Funciona sin internet: en el `.zip` los audios van en la carpeta `voz`, junto al archivo del juego.
- Si falta un audio, el juego usa la voz que traiga el navegador.

## Cambiar o agregar frases

1. Edita `src/ui/acruxLines.json` (todas las frases de Acrux están ahí).
2. Instala Piper una vez: `python3 -m venv /tmp/voz && /tmp/voz/bin/pip install piper-tts lameenc numpy`
3. Baja la voz `es_MX-claude-high.onnx` y su `.onnx.json` desde
   <https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_MX/claude/high>
4. Ejecuta: `/tmp/voz/bin/python scripts/generar-voz.py ruta/a/es_MX-claude-high.onnx`

Una prueba automática avisa si alguna frase del juego no tiene su audio.
