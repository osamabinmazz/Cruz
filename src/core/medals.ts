import type { FinalSummary } from "./Game";

/**
 * Medallas personales de la pantalla final. Reconocen lo que hizo cada
 * jugador; no hay puntajes ni comparaciones con otras personas.
 */
export interface Medal {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export function medalsFor(s: FinalSummary): Medal[] {
  const kept = (...ids: string[]) => ids.every((id) => !s.lostDefenses.includes(id as never));
  return [
    { id: "explorador", icon: "🧭", name: "Explorador del Sur", description: "Respondiste los siete desafíos.", earned: s.challengesCompleted === 7 },
    { id: "ojo-lince", icon: "🔭", name: "Ojo de lince", description: "Respondiste bien los siete desafíos.", earned: s.correctAnswers === 7 },
    {
      id: "maestro-eje",
      icon: "📏",
      name: "Maestro del eje mayor",
      description: "Reconociste el eje mayor y ubicaste a Gacrux y Acrux.",
      earned: kept("lanza-eje", "gemelas")
    },
    {
      id: "camino-sur",
      icon: "⬇️",
      name: "Camino al Sur",
      description: "Seguiste la prolongación, bajaste al horizonte y marcaste el Sur.",
      earned: kept("guia-punteada", "plomada", "brujula-austral")
    },
    { id: "guardian", icon: "🛡️", name: "Guardián del campamento", description: "Defendiste el campamento de las tres oleadas.", earned: s.victory },
    {
      id: "intacto",
      icon: "🏕️",
      name: "Campamento intacto",
      description: "Ganaste sin que el campamento perdiera energía.",
      earned: s.victory && s.baseEnergy === s.maxBaseEnergy
    },
    { id: "rescatista", icon: "💫", name: "Rescatista estelar", description: "Acertaste una pregunta de emergencia.", earned: s.rescue.correct > 0 },
    {
      id: "amigo-estrellas",
      icon: "⭐",
      name: "Amigo de las estrellas",
      description: "Una estrella de la Cruz del Sur bajó a ayudarte.",
      earned: s.rescue.heroesCalled.length > 0
    }
  ];
}
