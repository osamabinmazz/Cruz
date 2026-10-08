/**
 * Voz de Acrux con audios pregrabados (public/voz/*.mp3, hechos con Piper, un
 * sintetizador gratuito y de código abierto; ver scripts/generar-voz.py).
 * Si falta un audio, el juego usa la voz del navegador.
 */

/** Huella (cyrb53) de una frase: da el nombre de su archivo de audio. Igual que scripts/generar-voz.py. */
export function huella(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Texto limpio de lo que dice el globo de Acrux. */
export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Parte "¡Excelente! Ganaste Torre Brillo." en las tres frases grabadas; el resto va entero. */
export function splitPhrases(text: string): string[] {
  const m = /^(.+?[!.]) Ganaste (.+)\.$/.exec(text);
  return m ? [m[1], "Ganaste", m[2]] : [text];
}

export function clipUrl(phrase: string): string {
  return `voz/${huella(phrase)}.mp3`;
}

let current: HTMLAudioElement | null = null;

export function stopVoice(): void {
  if (current) {
    current.pause();
    current = null;
  }
}

function playClip(url: string, volume: number): Promise<boolean> {
  return new Promise((resolve) => {
    const a = new Audio(url);
    a.volume = volume;
    current = a;
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.play().catch(() => resolve(false));
  });
}

/** Reproduce las frases en orden. Devuelve false si no hubo audio para alguna (se usa la voz del navegador). */
export async function playPhrases(phrases: string[], volume = 0.9): Promise<boolean> {
  stopVoice();
  const token = (playPhrases as unknown as { id?: number });
  token.id = (token.id ?? 0) + 1;
  const mine = token.id;
  for (const p of phrases) {
    if (token.id !== mine) return true; // otra frase empezó: esta se cancela sin error
    if (!(await playClip(clipUrl(p), volume))) return false;
  }
  return true;
}
