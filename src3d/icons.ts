/** Iconos de la interfaz en SVG: se ven igual en todos los aparatos (los emojis cambian de uno a otro). */
type IconName =
  | "heart" | "heartEmpty" | "school" | "chest" | "dust" | "dash" | "soundOn" | "soundOff" | "sun" | "moon"
  | "flame" | "lock" | "shield" | "tower" | "fire" | "hand" | "swap" | "compass" | "bulb" | "bolt" | "star" | "check" | "zombie";

const F = (d: string) => `<path d="${d}" fill="currentColor"/>`;
const S = (d: string) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;

const ICONS: Record<IconName, string> = {
  heart: F("M12 21.300 3.600 13A5.600 5.600 0 0 1 11.500 5l.5.500.5-.500a5.600 5.600 0 0 1 7.900 8L12 21.300z"),
  heartEmpty: F("M12 21.300 3.600 13A5.600 5.600 0 0 1 11.500 5l.5.500.5-.500a5.600 5.600 0 0 1 7.900 8L12 21.300z"),
  school: F("M12 2.500 1.500 9H4v11h6v-6h4v6h6V9h2.500L12 2.500zM12 7a1.800 1.800 0 1 1 0 3.600A1.800 1.800 0 0 1 12 7z"),
  chest: F("M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2H3v-2zm0 3h7v2h4v-2h7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"),
  dust: F("M12 1.500l2.600 7.900L22.500 12l-7.900 2.600L12 22.500l-2.600-7.900L1.500 12l7.900-2.600L12 1.500z"),
  dash: S("M3 7h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 17h7"),
  soundOn: F("M3 9v6h4l5 4V5L7 9H3z") + S("M15.500 8.500a5 5 0 0 1 0 7M18.500 6a8.500 8.500 0 0 1 0 12"),
  soundOff: F("M3 9v6h4l5 4V5L7 9H3z") + S("M16 9l6 6M22 9l-6 6"),
  sun: `<circle cx="12" cy="12" r="4.500" fill="currentColor"/>` + S("M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100 7 17M17 7l2.100-2.100"),
  moon: F("M20.500 14.500A8.500 8.500 0 0 1 9.500 3.500a8.500 8.500 0 1 0 11 11z"),
  flame: F("M12.500 2c.8 4 5.500 6 5.500 11a6 6 0 0 1-12 0c0-2.200 1-3.800 2.200-5 0 2 .9 3 2 3.200C10 8.500 11.500 5.500 12.500 2z"),
  lock: F("M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h6V7a3 3 0 0 0-6 0v3z"),
  shield: F("M12 2l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11V5l8-3z"),
  tower: F("M7 3h2v2h2V3h2v2h2V3h2v6l-2 2v7h2.500v3h-11v-3H9v-7L7 9V3z"),
  fire: `<circle cx="12" cy="12" r="3" fill="currentColor"/>` + S("M12 2v5M12 17v5M2 12h5M17 12h5") + `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>`,
  hand: F("M8 13V5.500a1.500 1.500 0 0 1 3 0V11h.5V3.500a1.500 1.500 0 0 1 3 0V11h.5V5.500a1.500 1.500 0 0 1 3 0V15c0 4.200-2.700 7-6.500 7-3 0-4.600-1.500-6-4l-2.400-4A1.500 1.500 0 0 1 5.100 12L8 15.500V13z"),
  swap: S("M4 8h14l-3.500-3.500M20 16H6l3.500 3.500"),
  compass: `<circle cx="12" cy="12" r="9.500" fill="none" stroke="currentColor" stroke-width="2.200"/>` + F("M16.500 7.500l-2.300 6.700-6.700 2.300 2.300-6.700 6.700-2.300z"),
  bulb: S("M9 21h6M10 18h4M12 3a6 6 0 0 0-3.500 10.900V16h7v-2.100A6 6 0 0 0 12 3z"),
  bolt: F("M13.500 2L4.500 14H10l-1 8 9-12h-5.500l1-8z"),
  star: F("M12 2.500l2.900 6 6.600.9-4.800 4.600 1.200 6.500-5.900-3.100-5.900 3.100 1.200-6.500L2.500 9.400l6.600-.9 2.900-6z"),
  check: S("M4 12.500l5 5L20 6.500"),
  zombie: F("M12 2.500a8.500 8.500 0 0 0-8.500 8.500c0 2.700 1.200 4.400 2.800 5.600V21h3v-2h1.500v2h2.400v-2H15v2h3v-4.400c1.600-1.200 2.800-2.900 2.800-5.600A8.500 8.500 0 0 0 12 2.500z") + `<circle cx="8.700" cy="11" r="2" fill="#12182f"/><circle cx="15.300" cy="11" r="2" fill="#12182f"/>`
};

/** Devuelve el SVG de un icono. `size` es el alto en píxeles. */
export function ico(name: IconName, size = 20, extra = ""): string {
  return `<svg class="ico ${extra}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${ICONS[name]}</svg>`;
}

export type { IconName };
