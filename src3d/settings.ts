/** Ajustes de la 3.0 (se recuerdan en este aparato): calidad gráfica, cámara, ayudas y accesibilidad. */
export type Quality = "auto" | "alta" | "media" | "baja";

export interface Settings {
  quality: Quality;
  /** Sensibilidad de la cámara (0.5 a 2). */
  sensitivity: number;
  bigText: boolean;
  /** Dispara solo cuando hay un zombi a tiro, sin tener que mantener apretado. */
  autoFire: boolean;
  /** Sin temblores de cámara, relámpagos ni destellos de pantalla. */
  reducedMotion: boolean;
  /** Botones táctiles más grandes. */
  bigTouch: boolean;
  /** Cuenta la historia de Acrux al empezar cada día. */
  story: boolean;
  /** La cámara se acomoda sola detrás del estudiante al caminar (si no se dice, sí en pantallas táctiles). */
  followCam?: boolean;
}

export const DEFAULT_SETTINGS: Settings = { quality: "auto", sensitivity: 1, bigText: false, autoFire: false, reducedMotion: false, bigTouch: false, story: true };

const KEY = "cruz3-ajustes";

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Settings> | null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const s = { ...DEFAULT_SETTINGS, ...raw };
    if (!["auto", "alta", "media", "baja"].includes(s.quality)) s.quality = "auto";
    s.sensitivity = Math.max(0.5, Math.min(2, Number(s.sensitivity) || 1));
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento disponible */
  }
}

/** Nivel de detalle: 2 = alto, 1 = medio, 0 = bajo. */
export type Detail = 0 | 1 | 2;

export function detailOf(q: Quality, autoLevel: Detail): Detail {
  return q === "alta" ? 2 : q === "media" ? 1 : q === "baja" ? 0 : autoLevel;
}
