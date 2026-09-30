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

export interface RescueQuestion {
  id: string;
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

  // ---------- Difíciles: Bomba Estelar ----------
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
