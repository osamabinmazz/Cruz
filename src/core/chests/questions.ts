import { RESCUE_QUESTIONS, isRescueCorrect, type RescueFormat, type RescueQuestion } from "../rescue/questions";
import type { Rng } from "../rng";

/**
 * Preguntas de los cofres de la 3.0: orientación con la Cruz del Sur, el Sol y los puntos cardinales.
 * Cuatro formas de responder (elegir, ordenar, tocar el cielo) y una dentro del 3D: «mira hacia el Sur».
 * Orientación del mundo de la isla: Norte arriba del mapa, Este a la derecha; la escuela está al Este
 * y los zombis llegan por el portal del Oeste.
 */
export type ChestTopic = "cruz" | "sol" | "cardinales";
export type ChestFormat = RescueFormat | "face";

export interface ChestQuestion extends Omit<RescueQuestion, "format" | "category"> {
  topic: ChestTopic;
  format?: ChestFormat;
  /** Solo en «face»: rumbo (0 = Norte, 90 = Este, 180 = Sur, 270 = Oeste) hacia el que hay que mirar. */
  targetHeading?: number;
}

/** Margen (grados) con el que se acepta que el estudiante mira hacia el rumbo pedido. */
export const FACE_TOLERANCE = 35;

const choice = (id: string, topic: ChestTopic, prompt: string, options: string[], explanation: string): ChestQuestion => ({
  id,
  topic,
  prompt,
  options: options.map((text, i) => ({ id: "abcd"[i], text })),
  correctId: "a",
  explanation
});

// La respuesta correcta se escribe siempre primero y se baraja al mostrarla (ver shuffle en la interfaz).
export const SOL_QUESTIONS: readonly ChestQuestion[] = [
  choice("sol-sale", "sol", "¿Por dónde sale el Sol?", ["Por el Este.", "Por el Oeste.", "Por el Norte."], "El Sol sale por el Este (aproximadamente) y se pone por el Oeste."),
  choice("sol-pone", "sol", "¿Por dónde se pone el Sol?", ["Por el Oeste.", "Por el Este.", "Por el Sur."], "El Sol se pone por el Oeste, al lado contrario de donde sale."),
  choice("sol-brazo", "sol", "Extiendes el brazo derecho hacia donde sale el Sol. ¿Hacia dónde miras de frente?", ["Hacia el Norte.", "Hacia el Sur.", "Hacia el Oeste."], "Si el Este queda a tu derecha, estás mirando al Norte."),
  choice("sol-mediodia", "sol", "Al mediodía, en la mayor parte del hemisferio sur, el Sol queda hacia el…", ["Norte.", "Sur.", "Este."], "En el hemisferio sur el Sol del mediodía se ve hacia el Norte (en Chile, Argentina o Uruguay, por ejemplo)."),
  choice("sol-sombra-mediodia", "sol", "Al mediodía, ¿hacia dónde apunta la sombra de un poste en Chile, Argentina o Uruguay?", ["Hacia el Sur.", "Hacia el Norte.", "Hacia el Este."], "La sombra siempre apunta al lado contrario del Sol: si el Sol está al Norte, la sombra apunta al Sur."),
  choice("sol-sombra-manana", "sol", "Temprano en la mañana, ¿hacia dónde apunta la sombra de un árbol?", ["Hacia el Oeste.", "Hacia el Este.", "Hacia el Sur."], "El Sol sale por el Este, así que la sombra se estira hacia el Oeste."),
  choice("sol-sombra-tarde", "sol", "Al final de la tarde, ¿hacia dónde apunta la sombra de un árbol?", ["Hacia el Este.", "Hacia el Oeste.", "Hacia el Norte."], "El Sol está cerca del Oeste, así que la sombra se estira hacia el Este."),
  choice("sol-palo", "sol", "Clavas un palo y marcas la punta de su sombra por la mañana y otra vez 30 minutos después. Esa línea entre las dos marcas señala la dirección…", ["Este–Oeste.", "Norte–Sur.", "Noreste–Suroeste."], "La punta de la sombra se mueve de Oeste a Este: la línea entre las marcas es la línea Este–Oeste (la primera marca es el Oeste)."),
  choice("sol-espaldas", "sol", "Es de mañana y tienes el Sol a tu espalda. ¿Hacia dónde miras?", ["Hacia el Oeste.", "Hacia el Este.", "Hacia el Norte."], "De mañana el Sol está al Este; si lo tienes detrás, miras al Oeste."),
  choice("sol-tarde-derecha", "sol", "Al final de la tarde el Sol, que está en el Oeste, te queda a la derecha. ¿Hacia dónde miras?", ["Hacia el Sur.", "Hacia el Norte.", "Hacia el Este."], "Mirando al Sur, el Oeste queda a tu derecha."),
  choice("sol-todo-anio", "sol", "¿El Sol sale exactamente por el Este todos los días del año?", ["No: solo es exacto dos días al año; los demás sale un poco al Norte o al Sur del Este.", "Sí, siempre exactamente por el Este.", "No: sale unas veces por el Este y otras por el Oeste."], "Por eso el Este del Sol es aproximado: la dirección cambia un poco con las estaciones."),
  choice("sol-giro", "sol", "¿Por qué parece que el Sol sale y se pone cada día?", ["Porque la Tierra gira sobre sí misma.", "Porque el Sol se apaga y se enciende.", "Porque el Sol da vueltas alrededor de la Tierra todos los días."], "La Tierra gira y por eso vemos que el Sol sube por el Este y baja por el Oeste."),
  choice("sol-sombra-corta", "sol", "¿Cuándo es más corta la sombra de un poste?", ["Al mediodía.", "Al amanecer.", "Al atardecer."], "Al mediodía el Sol está más alto y la sombra es la más corta del día."),
  choice("sol-seguro", "sol", "Para orientarte con el Sol, ¿qué es lo más seguro?", ["Mirar su sombra, sin mirar el Sol directamente.", "Mirar el Sol fijamente un rato.", "Mirarlo con unos lentes cualquiera."], "Nunca se mira el Sol directamente: se usa la sombra de un palo."),
  choice("sol-orden", "sol", "Durante el día, el Sol se mueve por el cielo…", ["De Este a Oeste.", "De Oeste a Este.", "De Norte a Sur."], "Sube por el Este, pasa por lo alto y baja por el Oeste.")
];

export const CARDINAL_QUESTIONS: readonly ChestQuestion[] = [
  choice("card-cuatro", "cardinales", "¿Cuáles son los cuatro puntos cardinales?", ["Norte, Sur, Este y Oeste.", "Arriba, abajo, izquierda y derecha.", "Norte, Sur, Centro y Borde."], "Los cuatro puntos cardinales son Norte, Sur, Este y Oeste."),
  choice("card-opuesto-n", "cardinales", "¿Cuál es el punto opuesto al Norte?", ["El Sur.", "El Este.", "El Oeste."], "El Norte y el Sur son opuestos; también lo son el Este y el Oeste."),
  choice("card-opuesto-e", "cardinales", "¿Cuál es el punto opuesto al Este?", ["El Oeste.", "El Norte.", "El Sur."], "El Este y el Oeste son opuestos."),
  choice("card-derecha", "cardinales", "Miras al Norte. ¿Qué punto cardinal queda a tu derecha?", ["El Este.", "El Oeste.", "El Sur."], "Mirando al Norte, el Este queda a la derecha y el Oeste a la izquierda."),
  choice("card-izquierda", "cardinales", "Miras al Sur. ¿Qué punto cardinal queda a tu izquierda?", ["El Este.", "El Oeste.", "El Norte."], "Mirando al Sur, el Este queda a la izquierda y el Oeste a la derecha."),
  choice("card-media-vuelta", "cardinales", "Miras al Este y das media vuelta. ¿Hacia dónde miras ahora?", ["Hacia el Oeste.", "Hacia el Norte.", "Hacia el Sur."], "Media vuelta es girar al lado contrario: del Este pasas al Oeste."),
  choice("card-cuarto", "cardinales", "Miras al Oeste y giras un cuarto de vuelta a la derecha. ¿Hacia dónde miras?", ["Hacia el Norte.", "Hacia el Sur.", "Hacia el Este."], "Girando a la derecha el orden es Norte, Este, Sur, Oeste y otra vez Norte: del Oeste pasas al Norte."),
  choice("card-noreste", "cardinales", "El punto que está entre el Norte y el Este se llama…", ["Noreste.", "Sureste.", "Noroeste."], "Entre el Norte y el Este está el Noreste."),
  choice("card-suroeste", "cardinales", "El punto que está entre el Sur y el Oeste se llama…", ["Suroeste.", "Noreste.", "Sureste."], "Entre el Sur y el Oeste está el Suroeste."),
  choice("card-brujula", "cardinales", "La aguja de una brújula señala aproximadamente hacia el…", ["Norte.", "Sur.", "Este."], "La aguja de la brújula apunta (aproximadamente) al Norte."),
  choice("card-detras", "cardinales", "Miras hacia donde apunta la aguja de la brújula (el Norte). ¿Qué punto queda detrás de ti?", ["El Sur.", "El Este.", "El Norte."], "Detrás del Norte siempre está el Sur."),
  choice("card-escuela", "cardinales", "En la isla del juego, ¿hacia dónde queda la escuela respecto del centro del mapa?", ["Hacia el Este.", "Hacia el Oeste.", "Hacia el Norte."], "La escuela está en el lado derecho del mapa, que es el Este."),
  choice("card-portal", "cardinales", "Los zombis llegan por el portal del lado izquierdo del mapa. ¿Qué punto cardinal es ese lado?", ["El Oeste.", "El Este.", "El Sur."], "El lado izquierdo del mapa (con el Norte arriba) es el Oeste."),
  choice("card-zombi", "cardinales", "Un zombi camina desde el portal del Oeste hasta la escuela. ¿Hacia dónde camina en general?", ["Hacia el Este.", "Hacia el Oeste.", "Hacia el Sur."], "Va del Oeste hacia el Este."),
  {
    id: "mira-sur",
    topic: "cardinales",
    format: "face",
    targetHeading: 180,
    prompt: "Gira la cámara para mirar hacia el SUR y toca CONFIRMAR. (De noche, la Cruz del Sur te ayuda.)",
    options: [],
    correctId: "S",
    explanation: "El Sur es el rumbo opuesto al Norte: mirando al Sur, el Este queda a tu izquierda."
  },
  {
    id: "mira-este",
    topic: "cardinales",
    format: "face",
    targetHeading: 90,
    prompt: "Gira la cámara para mirar hacia el ESTE (por donde sale el Sol) y toca CONFIRMAR.",
    options: [],
    correctId: "E",
    explanation: "El Este está a la derecha del Norte; en esta isla es el lado de la escuela."
  },
  {
    id: "mira-norte",
    topic: "cardinales",
    format: "face",
    targetHeading: 0,
    prompt: "Gira la cámara para mirar hacia el NORTE y toca CONFIRMAR.",
    options: [],
    correctId: "N",
    explanation: "El Norte es el lado de arriba del mapa; la aguja de la brújula roja lo señala."
  },
  {
    id: "mira-oeste",
    topic: "cardinales",
    format: "face",
    targetHeading: 270,
    prompt: "Gira la cámara para mirar hacia el OESTE (por donde se pone el Sol) y toca CONFIRMAR.",
    options: [],
    correctId: "O",
    explanation: "El Oeste es el lado contrario al Este: en esta isla, el lado del portal de los zombis."
  }
];

/** Preguntas de la Cruz del Sur: las de las emergencias de la 2.0 (elegir, ordenar, tocar el cielo y el horizonte). */
export const CRUZ_QUESTIONS: readonly ChestQuestion[] = RESCUE_QUESTIONS.map((q) => ({
  id: `cruz-${q.id}`,
  topic: "cruz" as const,
  prompt: q.prompt,
  visual: q.visual,
  options: q.options,
  correctId: q.correctId,
  explanation: q.explanation,
  format: q.format
}));

export const CHEST_QUESTIONS: readonly ChestQuestion[] = [...CRUZ_QUESTIONS, ...SOL_QUESTIONS, ...CARDINAL_QUESTIONS];

export function chestQuestionById(id: string): ChestQuestion {
  const q = CHEST_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Pregunta de cofre desconocida: ${id}`);
  return q;
}

/** ¿La respuesta es correcta? «face» llega como «face:rumbo»; el resto, como en las emergencias de la 2.0. */
export function isChestCorrect(q: ChestQuestion, answer: string): boolean {
  if (q.format === "face") {
    const m = /^face:(-?\d+(?:\.\d+)?)$/.exec(answer);
    if (!m || q.targetHeading === undefined) return false;
    const diff = Math.abs((((Number(m[1]) - q.targetHeading) % 360) + 540) % 360 - 180);
    return diff <= FACE_TOLERANCE;
  }
  return isRescueCorrect({ ...q, category: "easy", format: q.format as RescueFormat | undefined }, answer);
}

/** Texto de la respuesta correcta para mostrarlo si se falla. */
export function chestCorrectText(q: ChestQuestion): string {
  if (q.format === "face") return `mirar hacia el ${{ N: "Norte", S: "Sur", E: "Este", O: "Oeste" }[q.correctId] ?? q.correctId}`;
  if (q.format === "horizon") return "el punto del horizonte justo debajo del extremo de la guía";
  if (q.format === "order") return q.correctId.split(",").map((id, i) => `${i + 1}. ${q.options.find((o) => o.id === id)?.text ?? id}`).join(" ");
  return q.options.find((o) => o.id === q.correctId)?.text ?? q.correctId;
}

/** Elige preguntas al azar sin repetir hasta agotar el tema (y solo entonces repite). */
export class ChestQuestionBank {
  readonly used = new Set<string>();

  constructor(private readonly rng: Rng, private readonly pool: readonly ChestQuestion[] = CHEST_QUESTIONS) {}

  draw(topic?: ChestTopic): ChestQuestion {
    let list = this.pool.filter((q) => (!topic || q.topic === topic) && !this.used.has(q.id));
    if (list.length === 0) {
      for (const q of this.pool) if (!topic || q.topic === topic) this.used.delete(q.id);
      list = this.pool.filter((q) => !topic || q.topic === topic);
    }
    const q = list[Math.floor(this.rng() * list.length)];
    this.used.add(q.id);
    return q;
  }

  /** Un tema al azar, repartido parejo entre la Cruz del Sur, el Sol y los puntos cardinales. */
  drawAny(): ChestQuestion {
    const topics: ChestTopic[] = ["cruz", "sol", "cardinales"];
    return this.draw(topics[Math.floor(this.rng() * topics.length)]);
  }
}
