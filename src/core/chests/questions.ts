import { RESCUE_QUESTIONS, isRescueCorrect, type RescueFormat, type RescueQuestion } from "../rescue/questions";
import type { Rng } from "../rng";

/**
 * Preguntas de los cofres de la 3.0: orientación con la Cruz del Sur, el Sol y los puntos cardinales.
 * Cuatro formas de responder (elegir, ordenar, tocar el cielo) y una dentro del 3D: «mira hacia el Sur».
 * Orientación del mundo de la isla: Norte arriba del mapa, Este a la derecha; la escuela está al Este
 * y los zombis llegan por el portal del Oeste.
 */
export type ChestTopic = "cruz" | "sol" | "cardinales" | "luna";
export type ChestFormat = RescueFormat | "face" | "compass";

export interface ChestQuestion extends Omit<RescueQuestion, "format" | "category"> {
  topic: ChestTopic;
  format?: ChestFormat;
  /** Solo en «face»: rumbo (0 = Norte, 90 = Este, 180 = Sur, 270 = Oeste) hacia el que hay que mirar. */
  targetHeading?: number;
  /** Solo en «compass»: hacia dónde (grados desde arriba, en sentido del reloj) apunta la aguja que marca el Norte en el dibujo. */
  needle?: number;
}

/** Margen (grados) con el que se acepta que el estudiante mira hacia el rumbo pedido. */
export const FACE_TOLERANCE = 35;
/** Margen (grados) al tocar un punto cardinal en la brújula dibujada. */
export const COMPASS_TOLERANCE = 28;

/** Brújula dibujada: hay que tocar el punto cardinal pedido (la aguja roja marca el Norte, a veces girada). */
const compass = (id: string, prompt: string, heading: number, needle: number, explanation: string): ChestQuestion => ({
  id,
  topic: "cardinales",
  prompt,
  options: [],
  correctId: { 0: "N", 90: "E", 180: "S", 270: "O" }[heading] ?? String(heading),
  explanation,
  format: "compass",
  targetHeading: heading,
  needle
});

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
  choice("sol-orden", "sol", "Durante el día, el Sol se mueve por el cielo…", ["De Este a Oeste.", "De Oeste a Este.", "De Norte a Sur."], "Sube por el Este, pasa por lo alto y baja por el Oeste."),
  choice("sol-alto", "sol", "¿A qué hora del día está el Sol más alto en el cielo?", ["Al mediodía.", "Al amanecer.", "Al atardecer."], "Al mediodía el Sol llega a lo más alto de su recorrido."),
  choice("sol-amanecer", "sol", "Al amanecer, ¿dónde ves el Sol?", ["Cerca del horizonte, por el Este.", "Bien alto, hacia el Norte.", "Cerca del horizonte, por el Oeste."], "El Sol empieza su recorrido al ras del horizonte, por el Este."),
  choice("sol-espalda-mediodia", "sol", "Es mediodía en el hemisferio sur y estás de espaldas al Sol. ¿Hacia dónde miras?", ["Hacia el Sur.", "Hacia el Norte.", "Hacia el Oeste."], "Al mediodía el Sol queda al Norte; si lo tienes detrás, miras al Sur."),
  choice("sol-tarde-baja", "sol", "Por la tarde, el Sol va bajando hacia el…", ["Oeste.", "Este.", "Norte."], "Por la tarde el Sol baja hacia el Oeste, donde se pone."),
  choice("sol-24", "sol", "¿Cuánto tarda la Tierra en dar una vuelta completa sobre sí misma?", ["Un día (24 horas).", "Una semana.", "Un año."], "Una vuelta sobre sí misma dura un día y por eso hay día y noche."),
  choice("sol-reloj", "sol", "Un reloj de sol marca la hora con…", ["La sombra de una varilla.", "Un motor pequeño.", "La luz de una lámpara."], "La sombra de la varilla se mueve a lo largo del día, siguiendo al Sol."),
  choice("sol-isla", "sol", "En el juego, ¿por qué lado del mapa sale el Sol?", ["Por el derecho (Este), donde está la escuela.", "Por el izquierdo (Oeste), donde está el portal.", "Por arriba, sin cambiar de lugar."], "Con el Norte arriba, el Sol sale por la derecha del mapa (Este) y se pone por la izquierda (Oeste).")
];

/** La Luna: sale por el Este y se pone por el Oeste como el Sol, y sus fases dependen de dónde está respecto del Sol. */
export const LUNA_QUESTIONS: readonly ChestQuestion[] = [
  choice("luna-sale", "luna", "¿Por dónde sale la Luna, en general?", ["Por el Este.", "Por el Oeste.", "Por el Norte."], "La Luna sale por el Este y se pone por el Oeste, igual que el Sol."),
  choice("luna-pone", "luna", "¿Por dónde se pone la Luna, en general?", ["Por el Oeste.", "Por el Este.", "Por el Sur."], "La Luna se pone por el Oeste, al lado contrario de donde sale."),
  choice("luna-luz", "luna", "¿Por qué vemos brillar la Luna?", ["Porque refleja la luz del Sol.", "Porque tiene luz propia, como una linterna.", "Porque la ilumina la Tierra."], "La Luna no tiene luz propia: refleja la luz del Sol."),
  choice("luna-vuelta", "luna", "¿Cuánto tarda la Luna en dar una vuelta alrededor de la Tierra?", ["Cerca de un mes.", "Un día.", "Un año."], "Una vuelta dura unos 29 días: por eso las fases se repiten más o menos cada mes."),
  choice("luna-nueva", "luna", "¿Cómo se llama la fase en que casi no vemos la Luna?", ["Luna nueva.", "Luna llena.", "Luna roja."], "En luna nueva su cara iluminada mira hacia el Sol y casi no la vemos."),
  choice("luna-llena-sale", "luna", "En luna llena, ¿cuándo sale la Luna por el Este?", ["Cuando el Sol se pone, al atardecer.", "Cuando el Sol sale, al amanecer.", "Al mediodía."], "En luna llena la Luna está al lado contrario del Sol: sale cuando el Sol se pone."),
  choice("luna-llena-este", "luna", "El Sol se pone por el Oeste y hay luna llena. ¿Hacia dónde sale la Luna?", ["Hacia el Este.", "Hacia el Oeste.", "Hacia el Norte."], "La luna llena sale por el Este, justo en el lado opuesto al Sol que se pone."),
  choice("luna-dia", "luna", "¿Se puede ver la Luna de día?", ["Sí, a veces, cuando está sobre el horizonte.", "No, nunca.", "Solo en luna nueva."], "La Luna a veces se ve de día, pálida, cuando está por encima del horizonte."),
  choice("luna-fases", "luna", "¿Cuáles son las cuatro fases principales de la Luna?", ["Nueva, creciente, llena y menguante.", "Roja, azul, blanca y negra.", "Norte, Sur, Este y Oeste."], "La Luna pasa por luna nueva, cuarto creciente, luna llena y cuarto menguante."),
  choice("luna-mismo", "luna", "La Luna y el Sol, ¿se mueven por el cielo en el mismo sentido?", ["Sí: de Este a Oeste.", "No: la Luna va de Oeste a Este.", "No: la Luna no se mueve."], "Por el giro de la Tierra, los dos suben por el Este y bajan por el Oeste."),
  choice("luna-juego", "luna", "En la isla, ¿por dónde sale la Luna cuando hay luna llena?", ["Por el lado derecho del mapa, el Este.", "Por el lado del portal, el Oeste.", "No sale: siempre está arriba."], "Con el Norte arriba, la Luna sale por el Este (a la derecha del mapa) y se pone por el Oeste."),
  choice("luna-roja", "luna", "A veces la Luna se ve rojiza cerca del horizonte. ¿Por qué?", ["Porque su luz atraviesa mucho aire y se ven más los colores rojos.", "Porque se calienta.", "Porque cambia de planeta."], "Cerca del horizonte la luz atraviesa más atmósfera y se ve rojiza; ocurre también con el Sol al atardecer.")
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
  choice("card-izq-norte", "cardinales", "Corres hacia el Norte y giras a la izquierda. ¿Hacia dónde vas ahora?", ["Hacia el Oeste.", "Hacia el Este.", "Hacia el Sur."], "Mirando al Norte, la izquierda es el Oeste."),
  choice("card-oeste-izq", "cardinales", "Miras al Oeste. ¿Qué punto cardinal queda a tu izquierda?", ["El Sur.", "El Norte.", "El Este."], "Mirando al Oeste, el Sur queda a la izquierda y el Norte a la derecha."),
  choice("card-sureste", "cardinales", "El punto que está entre el Sur y el Este se llama…", ["Sureste.", "Suroeste.", "Noreste."], "Entre el Sur y el Este está el Sureste."),
  choice("card-noroeste", "cardinales", "El punto que está entre el Norte y el Oeste se llama…", ["Noroeste.", "Noreste.", "Suroeste."], "Entre el Norte y el Oeste está el Noroeste."),
  choice("card-grados", "cardinales", "¿Cuántos grados hay de un punto cardinal al siguiente (por ejemplo, del Norte al Este)?", ["90 grados.", "45 grados.", "180 grados."], "Una vuelta completa son 360 grados y hay cuatro puntos cardinales: 360 ÷ 4 = 90."),
  choice("card-sol-izq", "cardinales", "El Sol se está poniendo (por el Oeste) y te queda a la izquierda. ¿Hacia dónde miras?", ["Hacia el Norte.", "Hacia el Sur.", "Hacia el Este."], "Si el Oeste queda a tu izquierda, estás mirando al Norte."),
  choice("card-mapa", "cardinales", "En un mapa con el Norte hacia arriba, ¿hacia dónde queda el Este?", ["A la derecha.", "A la izquierda.", "Abajo."], "Con el Norte arriba, el Este está a la derecha, el Oeste a la izquierda y el Sur abajo."),
  choice("card-hacia-centro", "cardinales", "En la isla, caminas desde la escuela hacia el centro del mapa. ¿Hacia dónde vas?", ["Hacia el Oeste.", "Hacia el Este.", "Hacia el Norte."], "La escuela está en el Este; para ir al centro caminas hacia el lado contrario: el Oeste."),
  compass("card-br-sur", "Toca en la brújula el punto donde queda el SUR.", 180, 0, "Con la aguja roja arriba (Norte), el Sur queda abajo."),
  compass("card-br-este", "Toca en la brújula el punto donde queda el ESTE.", 90, 0, "Con el Norte arriba, el Este queda a la derecha."),
  compass("card-br-oeste-g", "La aguja roja de la brújula señala el Norte. Toca el punto donde queda el OESTE.", 270, 90, "El Oeste está 90° a la izquierda del Norte: si la aguja apunta a la derecha, el Oeste queda arriba."),
  compass("card-br-sur-g", "La aguja roja señala el Norte. Toca el punto donde queda el SUR.", 180, 270, "El Sur siempre está justo al lado contrario de la aguja que marca el Norte."),
  compass("card-br-este-g", "La aguja roja señala el Norte. Toca el punto donde queda el ESTE.", 90, 180, "Siguiendo el giro del reloj, el Este viene 90° después del Norte: si la aguja apunta hacia abajo, el Este queda a la izquierda."),
  compass("card-br-norte-g", "Toca en la brújula el punto donde queda el NORTE.", 0, 45, "El Norte es hacia donde apunta la aguja roja."),
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

const MORE_CRUZ: readonly ChestQuestion[] = [
  choice("cruz-m-brillante", "cruz", "¿Cuál es la estrella más brillante de la Cruz del Sur?", ["Acrux.", "Gacrux.", "Delta Crucis."], "Acrux, en el pie de la cruz, es la más brillante de las cuatro."),
  choice("cruz-m-dia", "cruz", "¿Se puede ver la Cruz del Sur de día?", ["No: la luz del Sol tapa las estrellas.", "Sí, siempre se ve igual.", "Sí, pero solo al mediodía."], "Las estrellas siguen ahí de día, pero la luz del cielo no deja verlas."),
  choice("cruz-m-donde", "cruz", "En la isla del juego, ¿hacia dónde tienes que mirar para ver la Cruz del Sur?", ["Hacia el Sur.", "Hacia el Norte.", "Hacia el Este."], "La Cruz del Sur está en el cielo del Sur, de ahí su nombre."),
  choice("cruz-m-frente", "cruz", "Tienes la Cruz del Sur de frente. ¿Qué punto cardinal queda a tu derecha?", ["El Oeste.", "El Este.", "El Norte."], "Mirando al Sur, el Oeste queda a la derecha y el Este a la izquierda."),
  choice("cruz-m-espalda", "cruz", "Tienes la Cruz del Sur a tu espalda. ¿Hacia dónde miras?", ["Hacia el Norte.", "Hacia el Sur.", "Hacia el Oeste."], "Detrás del Sur está el Norte."),
  choice("cruz-m-forma", "cruz", "¿Cómo se reconoce la Cruz del Sur?", ["Por una cruz de cuatro estrellas brillantes, algo inclinada.", "Por una fila de tres estrellas iguales.", "Por una estrella roja muy grande, sola."], "Sus cuatro estrellas forman una cruz, con un palo más largo que el otro."),
  choice("cruz-m-guias", "cruz", "Cerca de la Cruz del Sur hay dos estrellas muy brillantes. ¿Para qué sirven?", ["Ayudan a no confundir la cruz con otras figuras parecidas.", "Marcan el Norte.", "Indican la hora."], "Las dos estrellas guía están cerca de la cruz y ayudan a reconocerla."),
  choice("cruz-m-sur", "cruz", "¿Qué encuentras al seguir el eje mayor de la cruz y bajar hasta el horizonte?", ["El Sur aproximado.", "El Norte.", "El Este exacto."], "Ese es el método del juego: prolongar el eje mayor y bajar al horizonte para hallar el Sur aproximado.")
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

export const CHEST_QUESTIONS: readonly ChestQuestion[] = [...CRUZ_QUESTIONS, ...MORE_CRUZ, ...SOL_QUESTIONS, ...CARDINAL_QUESTIONS, ...LUNA_QUESTIONS];

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
  if (q.format === "compass") {
    const m = /^compass:(-?\d+(?:\.\d+)?)$/.exec(answer);
    if (!m || q.targetHeading === undefined) return false;
    return Math.abs((((Number(m[1]) - q.targetHeading) % 360) + 540) % 360 - 180) <= COMPASS_TOLERANCE;
  }
  return isRescueCorrect({ ...q, category: "easy", format: q.format as RescueFormat | undefined }, answer);
}

/** Texto de la respuesta correcta para mostrarlo si se falla. */
export function chestCorrectText(q: ChestQuestion): string {
  if (q.format === "face") return `mirar hacia el ${{ N: "Norte", S: "Sur", E: "Este", O: "Oeste" }[q.correctId] ?? q.correctId}`;
  if (q.format === "compass") return `el ${{ N: "Norte", S: "Sur", E: "Este", O: "Oeste" }[q.correctId] ?? q.correctId} de la brújula`;
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

  /** Una pregunta de «mira hacia…» (para el cofre estelar): hay que girar la cámara hacia el punto cardinal. */
  drawFace(): ChestQuestion {
    const faces = this.pool.filter((q) => q.format === "face");
    const fresh = faces.filter((q) => !this.used.has(q.id));
    const list = fresh.length ? fresh : faces;
    const q = list[Math.floor(this.rng() * list.length)];
    this.used.add(q.id);
    return q;
  }

  /** Un tema al azar, repartido parejo entre la Cruz del Sur, el Sol y los puntos cardinales. */
  drawAny(): ChestQuestion {
    const topics: ChestTopic[] = ["cruz", "sol", "cardinales", "luna"];
    return this.draw(topics[Math.floor(this.rng() * topics.length)]);
  }
}
