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

export const HERO_ICON = `<svg viewBox="0 0 120 120" class="reward-icon" aria-hidden="true">
  <path d="M38 50 Q30 92 24 108 L96 108 Q90 92 82 50 Z" fill="#2f6fe4"/>
  <path d="M38 50 Q36 80 44 104 L76 104 Q84 80 82 50 Z" fill="#1d4fb8"/>
  <rect x="46" y="50" width="28" height="42" rx="10" fill="#f4e3c1"/>
  <circle cx="60" cy="34" r="16" fill="#f7d7b5"/>
  <path d="M44 30 Q60 10 76 30 Q70 22 60 22 Q50 22 44 30 Z" fill="#6b4a2b"/>
  <circle cx="54" cy="35" r="2.4" fill="#2a2a3a"/><circle cx="66" cy="35" r="2.4" fill="#2a2a3a"/>
  <path d="M54 42 Q60 46 66 42" stroke="#a0522d" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M44 62 Q44 90 60 98 Q76 90 76 62 Z" fill="#12306e" stroke="#ffd54a" stroke-width="3"/>
  <circle cx="60" cy="68" r="2.6" fill="#ffb870"/>
  <circle cx="60" cy="88" r="3.4" fill="#fff"/>
  <circle cx="52" cy="77" r="2.4" fill="#fff"/>
  <circle cx="68" cy="75" r="2.4" fill="#fff"/>
  <circle cx="64" cy="82" r="1.3" fill="#fff"/>
  <path d="${starPath(100, 20, 6, 2.4, 4)}" fill="#fff"/>
  <path d="${starPath(18, 24, 5, 2, 4)}" fill="#fff" opacity="0.8"/>
</svg>`;
