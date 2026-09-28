/** Sonidos sintetizados con Web Audio. El sonido se puede activar o desactivar. */
type Note = [freq: number, duration: number];

const STORAGE_KEY = "cruz-sonido";

export class AudioManager {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;

  constructor() {
    try {
      this.enabled = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      this.enabled = true;
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(STORAGE_KEY, this.enabled ? "on" : "off");
    } catch {
      /* sin almacenamiento disponible */
    }
    if (this.master) this.master.gain.value = this.enabled ? 0.5 : 0;
    if (!this.enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    return this.enabled;
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.18;
        this.musicGain.connect(this.master);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", volume = 0.25, dest?: AudioNode): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  private sequence(notes: Note[], type: OscillatorType = "triangle", volume = 0.25): void {
    let t = 0;
    for (const [f, d] of notes) {
      if (f > 0) this.tone(f, t, d, type, volume);
      t += d * 0.9;
    }
  }

  click(): void {
    this.tone(660, 0, 0.06, "square", 0.05);
  }
  correct(): void {
    this.sequence([[523, 0.12], [659, 0.12], [784, 0.25]]);
  }
  wrong(): void {
    this.sequence([[330, 0.18], [262, 0.3]], "sine", 0.15);
  }
  unlock(): void {
    this.sequence([[784, 0.1], [988, 0.1], [1175, 0.1], [1568, 0.3]], "triangle", 0.2);
  }
  alert(): void {
    this.sequence([[880, 0.12], [0, 0.05], [880, 0.12], [0, 0.05], [1175, 0.2]], "square", 0.08);
  }
  heroic(): void {
    this.sequence([[392, 0.15], [523, 0.15], [659, 0.15], [784, 0.35], [659, 0.12], [784, 0.45]], "triangle", 0.22);
  }
  sparkle(): void {
    this.sequence([[1319, 0.06], [1568, 0.06], [2093, 0.12]], "sine", 0.08);
  }
  countdown(): void {
    this.tone(700, 0, 0.15, "square", 0.08);
  }
  whoosh(): void {
    for (let i = 0; i < 8; i++) this.tone(300 + i * 120, i * 0.04, 0.2, "sine", 0.06);
  }
  hit(): void {
    this.tone(160, 0, 0.2, "sawtooth", 0.06);
  }
  warning(): void {
    this.sequence([[523, 0.15], [392, 0.25]], "triangle", 0.15);
  }
  fanfare(): void {
    this.sequence([[523, 0.15], [659, 0.15], [784, 0.15], [1047, 0.5]], "triangle", 0.25);
  }

  /** Música de batalla: un bajo sencillo en bucle. */
  startMusic(): void {
    this.stopMusic();
    const ctx = this.ensure();
    if (!ctx) return;
    const bass = [110, 110, 131, 110, 147, 131, 110, 98];
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.enabled || !this.musicGain) return;
      const f = bass[this.musicStep % bass.length];
      this.tone(f, 0, 0.28, "triangle", 0.5, this.musicGain);
      if (this.musicStep % 2 === 0) this.tone(f * 2, 0.15, 0.1, "sine", 0.2, this.musicGain);
      this.musicStep++;
    }, 320);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  /** Atenúa (true) o recupera gradualmente (false) la música de batalla. */
  duckMusic(duck: boolean): void {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(duck ? 0.03 : 0.18, t + (duck ? 0.2 : 1.5));
  }

  /** Lee la consigna en voz alta si el sonido está activado y el navegador lo permite. */
  speak(text: string): void {
    if (!this.enabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-AR";
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch {
      /* lectura no disponible */
    }
  }
}
