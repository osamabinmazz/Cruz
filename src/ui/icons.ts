/** Iconos de los premios de rescate: fantásticos, sin armas ni apariencia realista. */

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return d + "Z";
}

export const BOMB_ICON = `<svg viewBox="0 0 120 120" class="reward-icon" aria-hidden="true">
  <defs><radialGradient id="bombGlow"><stop offset="0" stop-color="#fff6c2"/><stop offset="1" stop-color="#ffb703" stop-opacity="0"/></radialGradient></defs>
  <circle cx="60" cy="66" r="48" fill="url(#bombGlow)" opacity="0.55"/>
  <path d="${starPath(60, 68, 36, 17)}" fill="#ffd54a" stroke="#fff3b0" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="52" cy="64" r="4" fill="#3b2f7a"/><circle cx="68" cy="64" r="4" fill="#3b2f7a"/>
  <path d="M52 76 Q60 82 68 76" stroke="#3b2f7a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M60 32 Q64 20 74 16" stroke="#c9b6ff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="${starPath(78, 14, 7, 3, 4)}" fill="#fff"/>
  <path d="${starPath(20, 30, 6, 2.4, 4)}" fill="#fff" opacity="0.9"/>
  <path d="${starPath(102, 44, 5, 2, 4)}" fill="#fff" opacity="0.9"/>
  <path d="${starPath(18, 96, 5, 2, 4)}" fill="#fff" opacity="0.8"/>
  <path d="${starPath(100, 100, 6, 2.4, 4)}" fill="#fff" opacity="0.85"/>
</svg>`;

/** Héroe estrella: estrella con cara, capa azul y escudo con la Cruz del Sur, en el color de su estrella. */
export function starHeroIcon(color: string): string {
  return `<svg viewBox="0 0 120 120" class="reward-icon" aria-hidden="true">
  <defs><radialGradient id="heroGlow-${color.slice(1)}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
  <radialGradient id="heroBody-${color.slice(1)}" cx="0.4" cy="0.35"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${color}"/></radialGradient></defs>
  <circle cx="60" cy="60" r="54" fill="url(#heroGlow-${color.slice(1)})" opacity="0.6"/>
  <path d="M40 40 Q22 64 14 96 Q30 94 44 84 Z" fill="#2f6fe4" stroke="#141a33" stroke-width="3" stroke-linejoin="round"/>
  <path d="${starPath(60, 58, 36, 17)}" fill="url(#heroBody-${color.slice(1)})" stroke="#141a33" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="52" cy="46" rx="6" ry="3.5" fill="#fff" opacity="0.85" transform="rotate(-30 52 46)"/>
  <ellipse cx="54" cy="58" rx="2.6" ry="3.8" fill="#141a33"/><ellipse cx="67" cy="58" rx="2.6" ry="3.8" fill="#141a33"/>
  <path d="M54 66 Q60.5 72 67 66" stroke="#141a33" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M82 62 Q90 60 98 62 L98 76 Q96 86 90 90 Q84 86 82 76 Z" fill="#12306e" stroke="#ffd54a" stroke-width="3"/>
  <circle cx="90" cy="67" r="2" fill="#ffb870"/><circle cx="90" cy="83" r="2.6" fill="#fff"/>
  <circle cx="85" cy="75" r="1.8" fill="#fff"/><circle cx="95" cy="74" r="1.8" fill="#fff"/>
  <path d="${starPath(20, 22, 6, 2.4, 4)}" fill="#fff"/><path d="${starPath(104, 26, 5, 2, 4)}" fill="#fff" opacity="0.85"/>
</svg>`;
}
