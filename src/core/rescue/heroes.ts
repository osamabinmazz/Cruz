/**
 * Héroes estrella: las cuatro estrellas principales de la Cruz del Sur.
 * Cada rescate con héroe llama a una estrella distinta, siempre en el mismo orden.
 */
export type StarHeroId = "acrux" | "mimosa" | "gacrux" | "delta";

export interface StarHero {
  id: StarHeroId;
  name: string;
  /** Color de la estrella y del héroe. */
  color: string;
  /** Frase breve que la presenta, usando solo lo aprendido en el juego. */
  intro: string;
}

export const STAR_HEROES: readonly StarHero[] = [
  { id: "acrux", name: "Acrux", color: "#bfe3ff", intro: "la estrella más brillante, en el pie de la cruz" },
  { id: "mimosa", name: "Mimosa", color: "#9fc9ff", intro: "una de las estrellas del palo corto" },
  { id: "gacrux", name: "Gacrux", color: "#ffb070", intro: "la estrella anaranjada de la cabeza de la cruz" },
  { id: "delta", name: "Delta", color: "#e6ecff", intro: "la otra estrella del palo corto" }
];

/** Héroe que acude en el rescate número `index` (0, 1, 2…) de la batalla. */
export function heroForRescue(index: number): StarHero {
  return STAR_HEROES[index % STAR_HEROES.length];
}
