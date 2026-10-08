import { isFreeformCorrect, pointAnswer } from "../freeform";
import { SOUTH_POINT } from "../geometry";
/**
 * Banco de preguntas de emergencia. Es el mismo para Principiante y Avanzado.
 * - easy: Héroe Austral (reconocer, identificar o recordar un paso; tres opciones).
 * - hard: Bomba Estelar (ordenar, relacionar, interpretar una imagen o aplicar; tres o cuatro opciones).
 */
export type RescueCategory = "easy" | "hard";

export type RescueVisual = "rotated-cross" | "scheme-correct" | "scheme-from-gacrux" | "scheme-below-acrux";

export interface RescueOption {
  id: string;
  text: string;
  visual?: RescueVisual;
}

/**
 * Cómo se responde:
 * - choice: tocar una opción (por defecto).
 * - order: tocar los pasos en el orden correcto (`correctId` = ids separados por comas).
 * - star: tocar una estrella en el cielo (`correctId` = id de la estrella).
 * - horizon: tocar un punto del horizonte (se acepta con margen, ver freeform).
 */
export type RescueFormat = "choice" | "order" | "star" | "horizon";

export interface RescueQuestion {
  id: string;
  format?: RescueFormat;
  category: RescueCategory;
  prompt: string;
  visual?: RescueVisual;
  options: RescueOption[];
  correctId: string;
  /** Explicación de una sola oración que se muestra si la respuesta es incorrecta. */
  explanation: string;
}

export const RESCUE_QUESTIONS: readonly RescueQuestion[] = [
  // ---------- Fáciles: Héroe Austral ----------
  {
    id: "facil-figura",
    category: "easy",
    prompt: "¿Qué figura buscamos en el cielo nocturno?",
    options: [
      { id: "a", text: "La Cruz del Sur." },
      { id: "b", text: "Un círculo de estrellas." },
      { id: "c", text: "Cualquier estrella." }
    ],
    correctId: "a",
    explanation: "Buscamos la Cruz del Sur, el grupo de estrellas que usamos como referente para orientarnos."
  },
  {
    id: "facil-palo-largo",
    category: "easy",
    prompt: "¿Cómo llamamos al palo más largo de la Cruz del Sur?",
    options: [
      { id: "a", text: "Eje mayor." },
      { id: "b", text: "Horizonte." },
      { id: "c", text: "Camino." }
    ],
    correctId: "a",
    explanation: "El palo más largo de la Cruz del Sur se llama eje mayor."
  },
  {
    id: "facil-desde-estrella",
    category: "easy",
    prompt: "¿Desde qué estrella seguimos la línea-guía?",
    options: [
      { id: "a", text: "Acrux." },
      { id: "b", text: "El Sol." },
      { id: "c", text: "La Luna." }
    ],
    correctId: "a",
    explanation: "La línea-guía comienza en Acrux, la estrella del pie de la cruz."
  },
  {
    id: "facil-bajar",
    category: "easy",
    prompt: "Después de seguir la guía, ¿hacia dónde bajamos?",
    options: [
      { id: "a", text: "Hacia el horizonte." },
      { id: "b", text: "Hacia la parte superior del cielo." },
      { id: "c", text: "Hacia cualquier estrella." }
    ],
    correctId: "a",
    explanation: "Desde el extremo de la guía bajamos en línea recta hasta el horizonte."
  },
  {
    id: "facil-aproximada",
    category: "easy",
    prompt: "La dirección encontrada con este procedimiento es…",
    options: [
      { id: "a", text: "Aproximada." },
      { id: "b", text: "Exacta en todos los casos." },
      { id: "c", text: "Diferente cada segundo." }
    ],
    correctId: "a",
    explanation: "Con la Cruz del Sur encontramos el Sur de manera aproximada."
  },
  {
    id: "facil-cuatro",
    category: "easy",
    prompt: "¿Cuántas estrellas principales reconocemos en la Cruz del Sur?",
    options: [
      { id: "a", text: "Cuatro." },
      { id: "b", text: "Dos." },
      { id: "c", text: "Diez." }
    ],
    correctId: "a",
    explanation: "La Cruz del Sur tiene cuatro estrellas principales."
  },
  {
    id: "facil-extremo",
    category: "easy",
    prompt: "¿Cuál de estas estrellas está en el extremo desde donde prolongamos la línea?",
    options: [
      { id: "a", text: "Acrux." },
      { id: "b", text: "Gacrux." },
      { id: "c", text: "El Sol." }
    ],
    correctId: "a",
    explanation: "Prolongamos la línea desde Acrux, el extremo del eje mayor del lado del horizonte."
  },

  {
    id: "facil-toca-acrux",
    format: "star",
    category: "easy",
    prompt: "Toca en el cielo a Acrux, la estrella más brillante, en el pie de la cruz.",
    options: [
      { id: "gacrux", text: "Gacrux" },
      { id: "acrux", text: "Acrux" },
      { id: "mimosa", text: "Mimosa" },
      { id: "delta", text: "Delta" },
      { id: "epsilon", text: "Épsilon" }
    ],
    correctId: "acrux",
    explanation: "Acrux es la estrella más brillante de la cruz y está en el pie, en el extremo del eje mayor del lado del horizonte."
  },
  {
    id: "facil-toca-gacrux",
    format: "star",
    category: "easy",
    prompt: "Toca en el cielo a Gacrux, la estrella anaranjada de la cabeza de la cruz.",
    options: [
      { id: "gacrux", text: "Gacrux" },
      { id: "acrux", text: "Acrux" },
      { id: "mimosa", text: "Mimosa" },
      { id: "delta", text: "Delta" },
      { id: "epsilon", text: "Épsilon" }
    ],
    correctId: "gacrux",
    explanation: "Gacrux es la estrella anaranjada de la cabeza: el extremo del eje mayor que queda más lejos del horizonte."
  },
  {
    id: "facil-toca-pequena",
    format: "star",
    category: "easy",
    prompt: "Una de las estrellas del dibujo es pequeña y no es una de las cuatro principales. Tócala.",
    options: [
      { id: "gacrux", text: "Gacrux" },
      { id: "acrux", text: "Acrux" },
      { id: "mimosa", text: "Mimosa" },
      { id: "delta", text: "Delta" },
      { id: "epsilon", text: "Épsilon" }
    ],
    correctId: "epsilon",
    explanation: "Épsilon es la estrella pequeña del medio: no es una de las cuatro principales."
  },
  {
    id: "facil-extremos",
    category: "easy",
    prompt: "¿Qué estrellas están en las puntas del eje mayor?",
    options: [
      { id: "a", text: "Gacrux y Acrux." },
      { id: "b", text: "Mimosa y Delta." },
      { id: "c", text: "Acrux y Mimosa." }
    ],
    correctId: "a",
    explanation: "El eje mayor, el palo largo, va de Gacrux a Acrux."
  },
  {
    id: "facil-hemisferio",
    category: "easy",
    prompt: "La Cruz del Sur se ve desde…",
    options: [
      { id: "a", text: "El hemisferio sur, cerca del polo sur celeste." },
      { id: "b", text: "Solo desde el Polo Norte." },
      { id: "c", text: "Cualquier lugar, de día." }
    ],
    correctId: "a",
    explanation: "La Cruz del Sur se ve en el cielo del hemisferio sur, y nos ayuda a encontrar el Sur."
  },

  // ---------- Difíciles: Bomba Estelar ----------
  {
    id: "dificil-ordenar-tres",
    format: "order",
    category: "hard",
    prompt: "Toca los tres pasos en el orden correcto para encontrar el Sur aproximado.",
    options: [
      { id: "a", text: "ENCONTRAR la Cruz del Sur." },
      { id: "b", text: "SEGUIR la prolongación del eje mayor desde Acrux." },
      { id: "c", text: "BAJAR hasta el horizonte." }
    ],
    correctId: "a,b,c",
    explanation: "Primero encontramos la cruz, luego seguimos la prolongación desde Acrux y por último bajamos al horizonte."
  },
  {
    id: "dificil-ordenar-cuatro",
    format: "order",
    category: "hard",
    prompt: "Toca los pasos en el orden correcto, empezando por lo primero que haces.",
    options: [
      { id: "a", text: "Reconocer la Cruz del Sur." },
      { id: "b", text: "Ubicar el eje mayor, de Gacrux a Acrux." },
      { id: "c", text: "Prolongar el eje mayor desde Acrux." },
      { id: "d", text: "Bajar hasta el horizonte y marcar el Sur." }
    ],
    correctId: "a,b,c,d",
    explanation: "Reconocemos la cruz, ubicamos su eje mayor, lo prolongamos desde Acrux y bajamos al horizonte para marcar el Sur."
  },
  {
    id: "dificil-marcar-horizonte",
    format: "horizon",
    category: "hard",
    prompt: "La línea-guía ya termina en el cielo. Toca el punto del horizonte que marca el Sur aproximado.",
    options: [],
    correctId: pointAnswer(SOUTH_POINT.x),
    explanation: "El Sur aproximado está en el horizonte, justo debajo del extremo de la línea-guía."
  },
  {
    id: "dificil-gira",
    category: "hard",
    prompt: "Durante la noche la Cruz del Sur cambia de lugar y se inclina. ¿Por qué el método sigue funcionando?",
    options: [
      { id: "a", text: "Porque siempre seguimos su eje mayor, sin importar cómo esté inclinada." },
      { id: "b", text: "Porque la cruz no se mueve nunca." },
      { id: "c", text: "Porque solo sirve a una hora exacta." },
      { id: "d", text: "Porque el horizonte se mueve con ella." }
    ],
    correctId: "a",
    explanation: "El cielo gira durante la noche, pero el eje mayor siempre apunta hacia la zona del Sur."
  },
  {
    id: "dificil-nublado",
    category: "hard",
    prompt: "Una nube tapa la Cruz del Sur. ¿Qué es lo más sensato?",
    options: [
      { id: "a", text: "Esperar a que se vea la cruz antes de seguir el método." },
      { id: "b", text: "Marcar el Sur en cualquier punto del horizonte." },
      { id: "c", text: "Usar el eje menor." },
      { id: "d", text: "Prolongar desde Gacrux." }
    ],
    correctId: "a",
    explanation: "Sin ver la cruz no podemos seguir el eje mayor: hay que esperar a que se despeje."
  },
  {
    id: "dificil-orden",
    category: "hard",
    prompt: "¿Cuál es el orden correcto para encontrar el Sur aproximado?",
    options: [
      { id: "a", text: "Encontrar la Cruz del Sur, seguir la prolongación desde Acrux y bajar hasta el horizonte." },
      { id: "b", text: "Bajar al horizonte, buscar el Sol y seguir cualquier estrella." },
      { id: "c", text: "Encontrar Acrux, subir hasta Gacrux y marcar el Este." },
      { id: "d", text: "Buscar una estrella brillante y señalar directamente el Sur." }
    ],
    correctId: "a",
    explanation: "Primero encontramos la Cruz del Sur, luego seguimos la prolongación desde Acrux y por último bajamos hasta el horizonte."
  },
  {
    id: "dificil-esquemas",
    category: "hard",
    prompt: "¿Cuál esquema representa correctamente el procedimiento?",
    options: [
      { id: "a", text: "Esquema", visual: "scheme-correct" },
      { id: "b", text: "Esquema", visual: "scheme-from-gacrux" },
      { id: "c", text: "Esquema", visual: "scheme-below-acrux" }
    ],
    correctId: "a",
    explanation: "El esquema correcto prolonga el eje mayor desde Acrux hasta un punto del cielo y desde allí baja hasta el horizonte."
  },
  {
    id: "dificil-debajo-acrux",
    category: "hard",
    prompt: "¿Por qué no marcamos el Sur directamente debajo de Acrux?",
    options: [
      { id: "a", text: "Porque primero debemos seguir la prolongación del eje mayor." },
      { id: "b", text: "Porque Acrux indica directamente el Norte." },
      { id: "c", text: "Porque necesitamos esperar la salida del Sol." },
      { id: "d", text: "Porque cualquier punto del horizonte representa el Sur." }
    ],
    correctId: "a",
    explanation: "Antes de bajar al horizonte hay que seguir la prolongación del eje mayor desde Acrux."
  },
  {
    id: "dificil-corregir",
    category: "hard",
    prompt: "Una niña encontró la Cruz del Sur y marcó el Sur directamente desde Gacrux. ¿Qué paso debe corregir?",
    options: [
      { id: "a", text: "Debe seguir la prolongación desde Acrux." },
      { id: "b", text: "Debe borrar el horizonte." },
      { id: "c", text: "Debe buscar la Luna." },
      { id: "d", text: "Debe utilizar el eje menor." }
    ],
    correctId: "a",
    explanation: "Después de encontrar la cruz hay que seguir la prolongación del eje mayor desde Acrux, no marcar el Sur desde Gacrux."
  },
  {
    id: "dificil-referente",
    category: "hard",
    prompt: "¿Cuál afirmación explica mejor cómo se usa la Cruz del Sur?",
    options: [
      { id: "a", text: "Es un referente que permite aproximarnos al Sur siguiendo su eje mayor." },
      { id: "b", text: "Su eje menor señala directamente el Sur exacto." },
      { id: "c", text: "Cualquiera de sus estrellas señala siempre el Sur." },
      { id: "d", text: "Solo permite orientarse durante el día." }
    ],
    correctId: "a",
    explanation: "La Cruz del Sur es un referente: siguiendo su eje mayor nos aproximamos al Sur."
  },
  {
    id: "dificil-rotada",
    category: "hard",
    prompt: "La Cruz del Sur aparece inclinada. ¿Qué debemos observar aunque la figura esté así?",
    visual: "rotated-cross",
    options: [
      { id: "a", text: "El eje mayor formado por Gacrux y Acrux." },
      { id: "b", text: "La parte superior de la pantalla." },
      { id: "c", text: "La estrella situada más a la derecha." },
      { id: "d", text: "La posición de la Luna." }
    ],
    correctId: "a",
    explanation: "Aunque la cruz esté inclinada, siempre observamos su eje mayor, que va de Gacrux a Acrux."
  },
  {
    id: "dificil-linea-guia",
    category: "hard",
    prompt: "¿Qué representa la línea-guía punteada?",
    options: [
      { id: "a", text: "La prolongación del eje mayor desde Acrux." },
      { id: "b", text: "El horizonte." },
      { id: "c", text: "El eje menor." },
      { id: "d", text: "El recorrido de los zombis." }
    ],
    correctId: "a",
    explanation: "La línea-guía punteada es la prolongación del eje mayor que comienza en Acrux."
  }
];

export function questionById(id: string): RescueQuestion {
  const q = RESCUE_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Pregunta desconocida: ${id}`);
  return q;
}

/** ¿La respuesta del estudiante es correcta? (según el formato de la pregunta). */
export function isRescueCorrect(q: RescueQuestion, answer: string): boolean {
  if (q.format === "horizon") return isFreeformCorrect("point", answer);
  return answer === q.correctId;
}

/** Texto de la respuesta correcta, para mostrarlo si el estudiante se equivoca. */
export function rescueCorrectText(q: RescueQuestion): string {
  const text = (id: string) => q.options.find((o) => o.id === id)?.text ?? id;
  if (q.format === "order") return q.correctId.split(",").map((id, i) => `${i + 1}. ${text(id)}`).join(" ");
  if (q.format === "horizon") return "el punto del horizonte justo debajo del extremo de la guía";
  return text(q.correctId);
}
