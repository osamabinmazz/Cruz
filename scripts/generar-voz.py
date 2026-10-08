#!/usr/bin/env python3
"""
Genera las frases de Acrux como audios MP3 con Piper, un sintetizador de voz
gratuito y de código abierto que funciona sin internet (https://github.com/OHF-Voice/piper1-gpl).

Uso (una sola vez, o cuando cambien las frases de src/ui/acruxLines.json):
  python3 -m venv /tmp/voz && /tmp/voz/bin/pip install piper-tts lameenc numpy
  # voz es_MX "claude" (licencia Apache-2.0), desde rhasspy/piper-voices en Hugging Face:
  #   es/es_MX/claude/high/es_MX-claude-high.onnx  y  .onnx.json
  /tmp/voz/bin/python scripts/generar-voz.py ruta/a/es_MX-claude-high.onnx

Deja los archivos en public/voz/<huella>.mp3 y un public/voz/manifiesto.json.
La "huella" se calcula igual que en src/ui/voz.ts.
"""
import json
import sys
import wave
from pathlib import Path

import lameenc
import numpy as np
from piper import PiperVoice

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "voz"
MASK53 = (1 << 53) - 1


def imul(a: int, b: int) -> int:
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF


def huella(texto: str) -> str:
    """Mismo hash (cyrb53) que usa el juego para buscar el audio de una frase."""
    h1, h2 = 0xDEADBEEF, 0x41C6CE57
    for ch in texto:
        c = ord(ch)
        h1 = imul(h1 ^ c, 2654435761)
        h2 = imul(h2 ^ c, 1597334677)
    h1 = (imul(h1 ^ (h1 >> 16), 2246822507) ^ imul(h2 ^ (h2 >> 13), 3266489909)) & 0xFFFFFFFF
    h2 = (imul(h2 ^ (h2 >> 16), 2246822507) ^ imul(h1 ^ (h1 >> 13), 3266489909)) & 0xFFFFFFFF
    n = 4294967296 * (2097151 & h2) + h1
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    s = ""
    while n:
        n, r = divmod(n, 36)
        s = digits[r] + s
    return s or "0"


def frases(lines: dict) -> list[str]:
    out = list(lines["intros"].values()) + lines["cheers"] + lines["comforts"] + list(lines["guide"].values())
    out += [lines["ganaste"]] + lines["weapons"]
    return list(dict.fromkeys(out))


def a_mp3(pcm: np.ndarray, rate: int) -> bytes:
    enc = lameenc.Encoder()
    enc.set_bit_rate(40)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(pcm.astype(np.int16).tobytes()) + enc.flush())


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    voz = PiperVoice.load(sys.argv[1])
    lines = json.loads((ROOT / "src" / "ui" / "acruxLines.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    manifiesto = {}
    for texto in frases(lines):
        pcm = np.concatenate([np.frombuffer(c.audio_int16_bytes, dtype=np.int16) for c in voz.synthesize(texto)])
        # Un poco de silencio al final para que no corte la última sílaba.
        pcm = np.concatenate([pcm, np.zeros(int(voz.config.sample_rate * 0.12), dtype=np.int16)])
        nombre = huella(texto)
        (OUT / f"{nombre}.mp3").write_bytes(a_mp3(pcm, voz.config.sample_rate))
        manifiesto[nombre] = texto
        print(f"{nombre}.mp3  {len(pcm) / voz.config.sample_rate:4.1f}s  {texto}")
    (OUT / "manifiesto.json").write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(manifiesto)} frases, {sum(p.stat().st_size for p in OUT.glob('*.mp3')) // 1024} KB")


if __name__ == "__main__":
    main()
