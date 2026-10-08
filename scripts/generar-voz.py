#!/usr/bin/env python3
"""
Genera las frases de Acrux como audios MP3 con Kokoro, un modelo de voz gratuito
y de código abierto (licencia Apache-2.0) que funciona sin internet y suena
mucho más natural que los sintetizadores clásicos.

Uso (una sola vez, o cuando cambien las frases de src/ui/acruxLines.json):
  python3 -m venv /tmp/voz && /tmp/voz/bin/pip install kokoro-onnx lameenc numpy
  # modelo y voces (releases de https://github.com/thewh1teagle/kokoro-onnx):
  #   kokoro-v1.0.onnx  y  voices-v1.0.bin
  /tmp/voz/bin/python scripts/generar-voz.py kokoro-v1.0.onnx voices-v1.0.bin [voz]

La voz por defecto es "ef_dora" (mujer, español). Otras: "em_alex", "em_santa".
Deja los archivos en public/voz/<huella>.mp3 y un public/voz/manifiesto.json.
La "huella" se calcula igual que en src/ui/voz.ts.
"""
import json
import sys
from pathlib import Path

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

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
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(pcm.astype(np.int16).tobytes()) + enc.flush())


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    modelo, voces = sys.argv[1], sys.argv[2]
    nombre_voz = sys.argv[3] if len(sys.argv) > 3 else "ef_dora"
    kokoro = Kokoro(modelo, voces)
    lines = json.loads((ROOT / "src" / "ui" / "acruxLines.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    for viejo in OUT.glob("*.mp3"):
        viejo.unlink()
    manifiesto = {}
    for texto in frases(lines):
        muestras, rate = kokoro.create(texto, voice=nombre_voz, speed=1.0, lang="es")
        # Normaliza el volumen sin saturar y deja un poco de silencio al final.
        pico = float(np.abs(muestras).max()) or 1.0
        pcm = (muestras / pico * 0.89 * 32767).astype(np.int16)
        pcm = np.concatenate([pcm, np.zeros(int(rate * 0.15), dtype=np.int16)])
        nombre = huella(texto)
        (OUT / f"{nombre}.mp3").write_bytes(a_mp3(pcm, rate))
        manifiesto[nombre] = texto
        print(f"{nombre}.mp3  {len(pcm) / rate:4.1f}s  {texto}")
    (OUT / "manifiesto.json").write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(manifiesto)} frases, {sum(p.stat().st_size for p in OUT.glob('*.mp3')) // 1024} KB")


if __name__ == "__main__":
    main()
