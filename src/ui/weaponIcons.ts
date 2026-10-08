import { defenseById, type DefenseId } from "../core/defenses";

/** Íconos SVG de las siete armas (estilo caricatura estelar) para las pantallas fuera de la batalla. */

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return d + "Z";
}

function wheel(x: number, y: number, r: number): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#6b4a2b"/>
    <path d="M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}" stroke="#c9a36b" stroke-width="1.5"/>
    <circle cx="${x}" cy="${y}" r="2" fill="#c9a36b"/>`;
}

function spark(x: number, y: number, color: string): string {
  return `<circle cx="${x}" cy="${y}" r="7" fill="${color}" opacity="0.35"/><path d="${starPath(x, y, 5, 2)}" fill="#fffbe0"/>`;
}

const BODIES: Record<DefenseId, (c: string, uid: string) => string> = {
  // Cañón.
  "torre-brillo": (c) => `
    <path d="M14 50 L40 50 L34 36 L20 36 Z" fill="#8a5a33"/>
    <g transform="rotate(-30 28 36)"><rect x="18" y="30" width="34" height="12" rx="5" fill="#2b3a6b"/>
      <rect x="31" y="30" width="3" height="12" fill="${c}"/><rect x="48" y="28" width="5" height="16" rx="2" fill="${c}"/></g>
    ${wheel(18, 50, 7)}${wheel(36, 50, 7)}${spark(54, 14, c)}`,
  // Torreta de cuatro cañones.
  "cuarteto-luz": (c) => `
    <rect x="18" y="34" width="28" height="22" rx="6" fill="#34477d"/>
    <g transform="rotate(-25 32 32)">
      ${[-7.5, -2.5, 2.5, 7.5].map((o) => `<rect x="34" y="${31 + o}" width="22" height="4" rx="2" fill="#1d2b55" stroke="${c}" stroke-width="1"/>`).join("")}
    </g>
    <circle cx="32" cy="32" r="11" fill="${c}"/>
    <circle cx="32" cy="27" r="1.8" fill="#1d2b55"/><circle cx="32" cy="37" r="1.8" fill="#1d2b55"/>
    <circle cx="27" cy="32" r="1.8" fill="#1d2b55"/><circle cx="37" cy="32" r="1.8" fill="#1d2b55"/>`,
  // Ballesta.
  "lanza-eje": (c) => `
    <path d="M20 58 L30 38 L40 58" stroke="#8a5a33" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g transform="rotate(-35 30 36)">
      <rect x="12" y="32" width="38" height="8" rx="3" fill="#6b4a2b"/>
      <path d="M38 14 Q54 36 38 58" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M38 14 L31 36 L38 58" stroke="#f4f6ff" stroke-width="1.5" fill="none"/>
      <path d="M31 36 H58" stroke="#fff" stroke-width="2.5"/>
      <path d="${starPath(60, 36, 5, 2, 4)}" fill="${c}"/>
    </g>`,
  // Cañón doble.
  "gemelas": (c) => `
    <rect x="13" y="38" width="36" height="14" rx="4" fill="#8a5a33"/>
    <g transform="rotate(-30 30 36)">
      <rect x="20" y="25" width="32" height="9" rx="4" fill="#2b3a6b"/><rect x="48" y="23" width="5" height="13" rx="2" fill="${c}"/>
      <rect x="20" y="37" width="32" height="9" rx="4" fill="#2b3a6b"/><rect x="48" y="35" width="5" height="13" rx="2" fill="#fff"/>
    </g>
    ${wheel(19, 52, 6)}${wheel(43, 52, 6)}${spark(55, 10, c)}`,
  // Rayo que frena.
  "guia-punteada": (c) => `
    <path d="M26 34 L14 58 M26 34 L38 58 M26 34 V60" stroke="#8d99ae" stroke-width="3" fill="none"/>
    <g transform="rotate(-35 26 30)">
      <path d="M22 12 Q40 30 22 48 Q30 30 22 12 Z" fill="#dfe6ff"/>
      <path d="M30 30 H44" stroke="${c}" stroke-width="2.5"/>
    </g>
    <circle cx="38" cy="22" r="6" fill="${c}" opacity="0.6"/>
    <path d="M40 20 L60 8" stroke="${c}" stroke-width="3" stroke-dasharray="3 4" stroke-linecap="round"/>`,
  // Catapulta.
  "plomada": (c) => `
    <rect x="10" y="46" width="42" height="8" rx="3" fill="#8a5a33"/>
    <path d="M22 48 L31 26 L40 48" stroke="#8a5a33" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M24 34 L50 14" stroke="#c9a36b" stroke-width="5" stroke-linecap="round"/>
    <circle cx="50" cy="14" r="7" fill="#6b4a2b"/>
    <path d="${starPath(50, 12, 7, 3)}" fill="${c}"/>
    ${wheel(16, 56, 5)}${wheel(46, 56, 5)}`,
  // Faro.
  "brujula-austral": (c, uid) => `
    <path d="M34 20 L62 8 L62 32 Z" fill="${c}" opacity="0.45"/>
    <clipPath id="${uid}"><path d="M22 60 L27 22 L37 22 L42 60 Z"/></clipPath>
    <path d="M22 60 L27 22 L37 22 L42 60 Z" fill="#f4f6ff"/>
    <g clip-path="url(#${uid})"><rect x="18" y="28" width="30" height="6" fill="#2f6fe4"/><rect x="18" y="40" width="30" height="6" fill="#2f6fe4"/><rect x="18" y="52" width="30" height="6" fill="#2f6fe4"/></g>
    <rect x="25" y="13" width="14" height="10" fill="#1d2b55"/><circle cx="32" cy="18" r="4" fill="#fffbe0"/>
    <path d="M23 13 L32 4 L41 13 Z" fill="#e07a5f"/>`,
  // Regla de Luz: soporte con una regla-rayo que atraviesa.
  "regla-luz": (c) => `
    <path d="M18 58 L28 40 L38 58" stroke="#8a5a33" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g transform="rotate(-28 28 36)">
      <rect x="6" y="30" width="52" height="12" rx="3" fill="#34477d" stroke="#141a33" stroke-width="1.5"/>
      ${[12, 20, 28, 36, 44, 52].map((x, i) => `<path d="M${x} 30 V${i % 2 ? 35 : 38}" stroke="${c}" stroke-width="1.5"/>`).join("")}
      <path d="M58 36 H64" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    </g>${spark(56, 12, c)}`,
  // Faro de la Vía Láctea: torre con ondas de luz.
  "faro-lactea": (c) => `
    <rect x="24" y="30" width="16" height="28" rx="4" fill="#34477d" stroke="#141a33" stroke-width="1.5"/>
    <circle cx="32" cy="24" r="10" fill="#1d2b55"/><circle cx="32" cy="24" r="6" fill="${c}"/>
    <path d="M12 24 A20 20 0 0 1 20 10 M52 24 A20 20 0 0 0 44 10" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M6 24 A26 26 0 0 1 16 5 M58 24 A26 26 0 0 0 48 5" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.5"/>
    <path d="${starPath(32, 24, 3, 1.2, 4)}" fill="#fff"/>`,
  // Bumerán de Plata: bumerán en arco con estela.
  "bumeran-plata": (c) => `
    <path d="M10 52 L26 38 L40 40 L54 20" stroke="#141a33" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 52 L26 38 L40 40 L54 20" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 52 L26 40 L40 42 L52 24" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M44 12 Q56 8 58 22" stroke="${c}" stroke-width="2.5" fill="none" stroke-dasharray="3 4" stroke-linecap="round"/>
    ${spark(14, 18, c)}`
};

/** Ícono del arma de una defensa, en su color. */
let counter = 0;

export function weaponIcon(id: DefenseId, className = "weapon-icon"): string {
  const d = defenseById(id);
  const uid = `faro-${++counter}`;
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="32" cy="60" rx="24" ry="4" fill="#222c4d" opacity="0.9"/>${BODIES[id](d.color, uid)}</svg>`;
}

/** Ícono de un puesto de guardianes: una estrellita con escudo y espada de luz. */
export function postIcon(className = "weapon-icon", color = "#8fd3ff"): string {
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="32" cy="60" rx="24" ry="4" fill="#222c4d" opacity="0.9"/>
    <path d="M12 52 L52 52 L46 40 L18 40 Z" fill="#8a5a33"/>
    <path d="M32 6 L38 20 L54 21 L42 31 L46 47 L32 38 L18 47 L22 31 L10 21 L26 20 Z" fill="#ffe66d" stroke="#141a33" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="27" cy="27" r="2" fill="#141a33"/><circle cx="37" cy="27" r="2" fill="#141a33"/>
    <path d="M28 33 Q32 37 36 33" stroke="#141a33" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M46 30 L58 14" stroke="#fffbe0" stroke-width="4" stroke-linecap="round"/><path d="M46 30 L58 14" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    <path d="M10 34 L20 34 L20 44 Q15 48 10 44 Z" fill="${color}" stroke="#141a33" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
