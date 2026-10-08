import type { DefenseId } from "../core/defenses";

/**
 * Sonidos sintetizados con Web Audio (sin archivos externos). El sonido se
 * puede activar o desactivar y la preferencia se recuerda en este navegador.
 */
type Note = [freq: number, duration: number];

const STORAGE_KEY = "cruz-sonido";

// Frecuencias de las notas usadas por la música.
const N: Record<string, number> = {
  E2: 82.41, F2: 87.31, G2: 98.0, "G#2": 103.83, A2: 110.0, B2: 123.47,
  C3: 130.81, E3: 164.81, F3: 174.61, G3: 196.0, "G#3": 207.65, A3: 220.0, B3: 246.94,
  C4: 261.63, E4: 329.63,
  "G#4": 415.3, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99
};

/** Cuatro compases (La menor, Mi menor, Fa, Mi) en semicorcheas. */
const BASS = [
  ["A2", "A2", "C3", "A2", "A2", "C3", "E3", "C3"],
  ["E2", "E2", "G2", "E2", "E2", "G2", "B2", "G2"],
  ["F2", "F2", "A2", "F2", "F2", "A2", "C3", "A2"],
  ["E2", "E2", "G#2", "E2", "E2", "G#2", "B2", "G#2"]
];
const CHORDS = [
  ["A3", "C4", "E4"],
  ["E3", "G3", "B3"],
  ["F3", "A3", "C4"],
  ["E3", "G#3", "B3"]
];
const LEAD: (string | null)[][] = [
  ["E5", null, "D5", "C5", null, "A4", null, null, "C5", null, "D5", null, "E5", null, null, null],
  ["G5", null, "E5", null, "D5", null, "B4", null, null, null, "D5", "E5", null, null, null, null],
  ["F5", null, "E5", "D5", null, "C5", null, null, "A4", null, "C5", null, "D5", null, null, null],
  ["E5", null, null, "D5", null, "B4", null, "G#4", null, null, "B4", null, "E5", null, null, null]
];


/** Cada noche de la campaña suena distinta: otro tono, otro tempo y otro timbre de melodía. */
interface MusicTheme {
  /** Semitonos que se sube o baja toda la música. */
  shift: number;
  /** Pulsos por minuto. */
  bpm: number;
  lead: OscillatorType;
  bass: OscillatorType;
}

const THEMES: Record<number, MusicTheme> = {
  0: { shift: 0, bpm: 112, lead: "triangle", bass: "triangle" }, // partida rápida
  1: { shift: -2, bpm: 96, lead: "sine", bass: "triangle" }, // bosque: tranquilo
  2: { shift: 2, bpm: 108, lead: "triangle", bass: "sine" }, // río: fluido
  3: { shift: -5, bpm: 100, lead: "sawtooth", bass: "triangle" }, // colina: misterio
  4: { shift: 3, bpm: 104, lead: "sine", bass: "sine" }, // lago: brillante
  5: { shift: 0, bpm: 124, lead: "square", bass: "sawtooth" } // escuela: la noche final
};

export class AudioManager {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private theme: MusicTheme = THEMES[0];
  private nextNoteTime = 0;
  private intensity = 1;
  private lastWeaponSound = new Map<string, number>();
  private recentSounds: number[] = [];
  private lastGroan = 0;

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
    if (this.master) this.master.gain.value = this.enabled ? 0.55 : 0;
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
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = 1;
        this.sfx.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.2;
        this.musicGain.connect(this.master);
        // Ruido blanco reutilizable para golpes, platillos y silbidos.
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  // ---------------- Primitivas ----------------

  /** Nota con envolvente; `slideTo` desliza la frecuencia durante la nota. */
  private toneAt(freq: number, at: number, duration: number, type: OscillatorType, volume: number, dest?: AudioNode, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(dest ?? this.sfx ?? this.master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", volume = 0.25, slideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    this.toneAt(freq, ctx.currentTime + start, duration, type, volume, undefined, slideTo);
  }

  /** Ráfaga de ruido filtrado. */
  private noiseAt(at: number, duration: number, volume: number, filter: BiquadFilterType, freq: number, dest?: AudioNode, sweepTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(f);
    f.connect(gain);
    gain.connect(dest ?? this.sfx ?? this.master);
    src.start(at, Math.random() * 0.5);
    src.stop(at + duration + 0.05);
  }

  private sequence(notes: Note[], type: OscillatorType = "triangle", volume = 0.25): void {
    let t = 0;
    for (const [f, d] of notes) {
      if (f > 0) this.tone(f, t, d, type, volume);
      t += d * 0.9;
    }
  }

  // ---------------- Efectos de la interfaz ----------------

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
    const ctx = this.ensure();
    if (!ctx) return;
    this.noiseAt(ctx.currentTime, 0.9, 0.35, "bandpass", 300, undefined, 3000);
    for (let i = 0; i < 8; i++) this.tone(300 + i * 120, i * 0.04, 0.2, "sine", 0.05);
  }
  hit(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    this.toneAt(140, ctx.currentTime, 0.25, "sawtooth", 0.08, undefined, 60);
    this.noiseAt(ctx.currentTime, 0.15, 0.2, "lowpass", 600);
  }
  warning(): void {
    this.sequence([[523, 0.15], [392, 0.25]], "triangle", 0.15);
  }
  fanfare(): void {
    this.sequence([[523, 0.15], [659, 0.15], [784, 0.15], [1047, 0.5]], "triangle", 0.25);
  }
  /** Golpe de energía del héroe. */
  energy(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    this.toneAt(300, ctx.currentTime, 0.3, "sawtooth", 0.06, undefined, 1400);
    this.toneAt(1200, ctx.currentTime + 0.05, 0.35, "sine", 0.1, undefined, 2400);
  }

  /** Quejido cómico de un zombi al caer (con pausa mínima entre quejidos). */
  groan(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastGroan < 0.6) return;
    this.lastGroan = now;
    const base = 150 + Math.random() * 60;
    this.toneAt(base, now, 0.4, "sawtooth", 0.035, undefined, base * 0.6);
    this.toneAt(base * 1.5, now, 0.35, "triangle", 0.03, undefined, base * 0.9);
  }

  // ---------------- Armas ----------------

  /** Sonido del disparo de cada arma, con límites para no saturar. */
  weapon(id: DefenseId): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const minGap = id === "guia-punteada" ? 0.45 : 0.14;
    if (now - (this.lastWeaponSound.get(id) ?? -1) < minGap) return;
    this.recentSounds = this.recentSounds.filter((t) => now - t < 0.25);
    if (this.recentSounds.length >= 5) return;
    this.recentSounds.push(now);
    this.lastWeaponSound.set(id, now);
    const v = 0.5;
    switch (id) {
      case "torre-brillo": // Cañón: chasquido, estruendo grave, retumbar y eco.
        this.noiseAt(now, 0.05, 0.3 * v, "highpass", 2500);
        this.noiseAt(now, 0.24, 0.4 * v, "lowpass", 900, undefined, 180);
        this.toneAt(110, now, 0.24, "sine", 0.5 * v, undefined, 42);
        this.noiseAt(now + 0.06, 0.5, 0.12 * v, "lowpass", 420, undefined, 120);
        this.noiseAt(now + 0.2, 0.3, 0.07 * v, "lowpass", 600, undefined, 200);
        break;
      case "cuarteto-luz": // Torreta: ráfaga de cuatro "piu" con destellos.
        for (let i = 0; i < 4; i++) {
          this.toneAt(1200 - i * 70, now + i * 0.045, 0.08, "square", 0.05 * v, undefined, 400);
          this.toneAt(2400 - i * 100, now + i * 0.045, 0.05, "sine", 0.025 * v, undefined, 1200);
          this.noiseAt(now + i * 0.045, 0.02, 0.06 * v, "highpass", 4500);
        }
        break;
      case "lanza-eje": // Ballesta: cuerda que vibra, silbido de la flecha y golpe.
        this.toneAt(340, now, 0.28, "triangle", 0.32 * v, undefined, 170);
        this.toneAt(170, now, 0.2, "sine", 0.2 * v, undefined, 90);
        this.noiseAt(now, 0.05, 0.22 * v, "highpass", 3200);
        this.noiseAt(now + 0.04, 0.3, 0.1 * v, "bandpass", 1500, undefined, 5000);
        break;
      case "gemelas": // Cañón doble: dos estruendos y un tintineo metálico.
        for (const d of [0, 0.08]) {
          this.noiseAt(now + d, 0.04, 0.22 * v, "highpass", 2500);
          this.noiseAt(now + d, 0.18, 0.3 * v, "lowpass", 1100, undefined, 250);
          this.toneAt(150 - d * 300, now + d, 0.17, "sine", 0.38 * v, undefined, 55);
        }
        this.toneAt(1500, now + 0.14, 0.2, "triangle", 0.03 * v, undefined, 1100);
        this.noiseAt(now + 0.1, 0.35, 0.08 * v, "lowpass", 500, undefined, 140);
        break;
      case "guia-punteada": // Rayo que frena: zumbido eléctrico con chisporroteo.
        this.toneAt(1400, now, 0.24, "sawtooth", 0.035 * v, undefined, 260);
        this.toneAt(700, now, 0.24, "sine", 0.06 * v, undefined, 520);
        for (let i = 0; i < 5; i++) this.noiseAt(now + 0.03 * i, 0.015, 0.07 * v, "highpass", 5000 - i * 400);
        break;
      case "plomada": // Catapulta: crujido de madera, silbido del peñasco y golpe del brazo.
        this.noiseAt(now, 0.09, 0.32 * v, "bandpass", 480);
        this.toneAt(85, now + 0.03, 0.18, "sine", 0.3 * v, undefined, 50);
        this.noiseAt(now + 0.06, 0.4, 0.18 * v, "bandpass", 650, undefined, 2800);
        break;
      case "regla-luz": // Rayo recto: silbido agudo que atraviesa.
        this.toneAt(2200, now, 0.22, "sawtooth", 0.04 * v, undefined, 700);
        this.toneAt(1100, now, 0.22, "sine", 0.07 * v, undefined, 400);
        this.noiseAt(now, 0.18, 0.12 * v, "bandpass", 3000, undefined, 6000);
        break;
      case "faro-lactea": // Pulso: campanilla grave que se expande.
        this.toneAt(520, now, 0.5, "sine", 0.12 * v, undefined, 300);
        this.toneAt(780, now + 0.04, 0.45, "sine", 0.06 * v, undefined, 520);
        this.noiseAt(now, 0.4, 0.06 * v, "lowpass", 1200, undefined, 300);
        break;
      case "bumeran-plata": // Bumerán: zumbido que sube y baja (ida y vuelta).
        this.toneAt(300, now, 0.3, "triangle", 0.1 * v, undefined, 700);
        this.toneAt(700, now + 0.3, 0.3, "triangle", 0.08 * v, undefined, 300);
        this.noiseAt(now, 0.5, 0.05 * v, "bandpass", 1800, undefined, 900);
        break;
      case "brujula-austral": // Faro: destello musical que se repite como eco.
        for (const [d, g] of [[0, 1], [0.12, 0.45]] as const) {
          this.toneAt(1320, now + d, 0.34, "sine", 0.08 * g * v);
          this.toneAt(1760, now + d + 0.03, 0.34, "sine", 0.05 * g * v);
          this.toneAt(1980, now + d + 0.06, 0.38, "sine", 0.045 * g * v);
        }
        break;
    }
  }

  /** Timbre de la escuela cuando un zombi llega. */
  bell(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      this.toneAt(1250, now + 0.12 + i * 0.11, 0.18, "square", 0.05);
      this.toneAt(1580, now + 0.12 + i * 0.11, 0.18, "sine", 0.05);
    }
  }

  /** Sonido de cada poder de estrella. */
  power(id: "rayo" | "escudo" | "lluvia" | "congelar"): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    switch (id) {
      case "rayo":
        this.noiseAt(now, 0.08, 0.45, "highpass", 3000);
        this.toneAt(900, now, 0.35, "sawtooth", 0.1, undefined, 80);
        this.toneAt(70, now + 0.02, 0.4, "sine", 0.4, undefined, 40);
        break;
      case "escudo":
        for (const [d, f] of [[0, 660], [0.08, 880], [0.16, 1320]] as const) this.toneAt(f, now + d, 0.4, "sine", 0.1);
        break;
      case "lluvia":
        for (let i = 0; i < 6; i++) {
          this.toneAt(1600 - i * 120, now + i * 0.1, 0.18, "triangle", 0.05, undefined, 500);
          this.noiseAt(now + 0.35 + i * 0.08, 0.1, 0.1, "lowpass", 900);
        }
        break;
      case "congelar":
        this.toneAt(2400, now, 0.6, "sine", 0.06, undefined, 600);
        this.noiseAt(now, 0.5, 0.15, "highpass", 5000, undefined, 2000);
        break;
    }
  }

  // ---------------- Música de batalla ----------------

  /** Capas de la música: 1 bajo y platillos, 2 suma batería y acordes, 3 suma melodía. */
  setMusicIntensity(level: number): void {
    this.intensity = Math.max(1, Math.min(3, level));
  }

  startMusic(night = 0): void {
    this.theme = THEMES[night] ?? THEMES[0];
    this.stopMusic();
    const ctx = this.ensure();
    if (!ctx) return;
    this.musicStep = 0;
    this.intensity = 1;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 25);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    if (!this.enabled) {
      this.nextNoteTime = ctx.currentTime + 0.1;
      return;
    }
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.playStep(this.musicStep, this.nextNoteTime);
      this.nextNoteTime += this.stepSeconds();
      this.musicStep = (this.musicStep + 1) % 64;
    }
  }

  private stepSeconds(): number {
    return 60 / this.theme.bpm / 4;
  }

  private note(name: string): number {
    return N[name] * 2 ** (this.theme.shift / 12);
  }

  private playStep(step: number, at: number): void {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const out = this.musicGain!;
    // Bajo en corcheas.
    if (s % 2 === 0) this.toneAt(this.note(BASS[bar][s / 2]), at, this.stepSeconds() * 1.8, this.theme.bass, this.theme.bass === "sawtooth" ? 0.3 : 0.55, out);
    // Platillo cerrado.
    if (s % 4 === 2) this.noiseAt(at, 0.05, 0.12, "highpass", 7000, out);
    if (this.intensity >= 2) {
      // Bombo y redoblante.
      if (s === 0 || s === 8 || (this.intensity >= 3 && s === 10)) this.toneAt(120, at, 0.18, "sine", 0.7, out, 45);
      if (s === 4 || s === 12) this.noiseAt(at, 0.12, 0.3, "bandpass", 1800, out);
      // Acordes cortos en los tiempos débiles.
      if (s === 4 || s === 12) for (const n of CHORDS[bar]) this.toneAt(this.note(n), at, 0.16, "square", 0.05, out);
    }
    if (this.intensity >= 3) {
      const note = LEAD[bar][s];
      if (note) this.toneAt(this.note(note), at, this.stepSeconds() * 1.6, this.theme.lead, this.theme.lead === "square" ? 0.1 : 0.22, out);
    }
  }

  /** Atenúa (true) o recupera gradualmente (false) la música de batalla. */
  duckMusic(duck: boolean): void {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(duck ? 0.03 : 0.2, t + (duck ? 0.2 : 1.5));
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
