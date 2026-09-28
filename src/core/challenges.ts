import type { DefenseId } from "./defenses";

/**
 * Los siete desafíos. Existe una única lista: Principiante y Avanzado cargan
 * exactamente estos problemas, con las mismas consignas, imágenes, opciones,
 * respuestas correctas y orden.
 */
export type ProcedureStep = "ENCONTRAR" | "SEGUIR" | "BAJAR";

/**
 * - single: elegir una opción.
 * - multi: elegir varias opciones (todas las correctas y ninguna incorrecta).
 * - assign: ubicar cada rótulo de `slots` sobre una opción; `correct` se lee
 *   en el mismo orden que `slots`.
 */
export type ChallengeMode = "single" | "multi" | "assign";

export type SceneId =
  | "three-groups"
  | "star-field"
  | "axis-lines"
  | "assign-names"
  | "prolongations"
  | "descents"
  | "south-points";

export interface ChallengeOption {
  id: string;
  label: string;
}

export interface Hint {
  text: string;
  /** Elemento de la escena que se resalta al mostrar la pista. */
  target?: string;
}

export interface Challenge {
  id: string;
  number: number;
  step: ProcedureStep;
  title: string;
  instruction: string;
  scene: SceneId;
  mode: ChallengeMode;
  options: ChallengeOption[];
  correct: string[];
  slots?: ChallengeOption[];
  hints: Hint[];
  /** Elemento señalado automáticamente cuando el nivel usa resaltados guiados. */
  guidedHighlight?: string;
  feedback: {
    correctExplanatory: string;
    correctBrief: string;
    wrongExplanatory: Record<string, string>;
    wrongBrief: string;
  };
  defense: DefenseId;
}

export const CHALLENGES: readonly Challenge[] = [
  {
    id: "reconocer-cruz",
    number: 1,
    step: "ENCONTRAR",
    title: "Reconocer la Cruz del Sur",
    instruction: "Observa los tres grupos de estrellas. ¿Cuál es la Cruz del Sur?",
    scene: "three-groups",
    mode: "single",
    options: [
      { id: "grupo-a", label: "Grupo A" },
      { id: "grupo-b", label: "Grupo B" },
      { id: "grupo-c", label: "Grupo C" }
    ],
    correct: ["grupo-b"],
    hints: [
      { text: "La Cruz del Sur tiene cuatro estrellas brillantes que forman una cruz con un palo largo y uno corto." },
      { text: "Mira el grupo que tiene forma de cruz o de cometa. Está resaltado.", target: "grupo-b" }
    ],
    feedback: {
      correctExplanatory:
        "¡Muy bien! El grupo B tiene cuatro estrellas brillantes que forman una cruz: un palo largo y uno corto.",
      correctBrief: "¡Correcto! Es la Cruz del Sur.",
      wrongExplanatory: {
        "grupo-a": "El grupo A forma un círculo. La Cruz del Sur tiene forma de cruz, con un palo largo y uno corto.",
        "grupo-c": "El grupo C forma una fila de estrellas. La Cruz del Sur tiene forma de cruz, con un palo largo y uno corto."
      },
      wrongBrief: "No es ese grupo. Intenta de nuevo."
    },
    defense: "torre-brillo"
  },
  {
    id: "cuatro-estrellas",
    number: 2,
    step: "ENCONTRAR",
    title: "Las cuatro estrellas principales",
    instruction: "Toca las cuatro estrellas principales de la Cruz del Sur.",
    scene: "star-field",
    mode: "multi",
    options: [
      { id: "lejana2", label: "Estrella 1" },
      { id: "mimosa", label: "Estrella 2" },
      { id: "gacrux", label: "Estrella 3" },
      { id: "epsilon", label: "Estrella 4" },
      { id: "delta", label: "Estrella 5" },
      { id: "lejana1", label: "Estrella 6" },
      { id: "acrux", label: "Estrella 7" }
    ],
    correct: ["mimosa", "gacrux", "delta", "acrux"],
    hints: [
      { text: "Busca las cuatro estrellas más brillantes que forman la cruz. Hay una estrella pequeña en el medio que no es principal." },
      { text: "La estrella de arriba de la cruz está resaltada. Busca las otras tres que forman la cruz con ella.", target: "gacrux" },
      { text: "La estrella del pie de la cruz, la más brillante, está resaltada.", target: "acrux" }
    ],
    feedback: {
      correctExplanatory:
        "¡Excelente! Esas son las cuatro estrellas principales: forman un palo largo y un palo corto. La estrella pequeña no es una de ellas.",
      correctBrief: "¡Correcto! Son las cuatro estrellas principales.",
      wrongExplanatory: {
        default:
          "Todavía no. Elige solo las cuatro estrellas brillantes que forman la cruz. Las estrellas pequeñas o alejadas no forman parte de la figura."
      },
      wrongBrief: "No son esas cuatro. Intenta de nuevo."
    },
    defense: "cuarteto-luz"
  },
  {
    id: "eje-mayor",
    number: 3,
    step: "ENCONTRAR",
    title: "El eje mayor",
    instruction: "¿Cuál de las líneas marca el eje mayor, es decir, el palo largo de la Cruz del Sur?",
    scene: "axis-lines",
    mode: "single",
    options: [
      { id: "linea-a", label: "Línea A" },
      { id: "linea-b", label: "Línea B" },
      { id: "linea-c", label: "Línea C" }
    ],
    correct: ["linea-c"],
    hints: [
      { text: "El eje mayor es el palo más largo de la cruz. Une la estrella de arriba con la estrella de abajo." },
      { text: "Compara las líneas: la línea resaltada es la más larga y atraviesa la cruz de punta a punta.", target: "linea-c" }
    ],
    feedback: {
      correctExplanatory:
        "¡Muy bien! La línea C es el eje mayor: el palo largo que une la estrella de arriba con la de abajo.",
      correctBrief: "¡Correcto! Ese es el eje mayor.",
      wrongExplanatory: {
        "linea-a": "La línea A es el palo corto de la cruz. El eje mayor es el palo más largo.",
        "linea-b": "La línea B une dos estrellas del borde, no atraviesa la cruz. El eje mayor es el palo más largo."
      },
      wrongBrief: "No es esa línea. Intenta de nuevo."
    },
    defense: "lanza-eje"
  },
  {
    id: "gacrux-acrux",
    number: 4,
    step: "ENCONTRAR",
    title: "Gacrux y Acrux",
    instruction: "Coloca los nombres Gacrux y Acrux en los extremos correctos del eje mayor.",
    scene: "assign-names",
    mode: "assign",
    slots: [
      { id: "gacrux", label: "Gacrux" },
      { id: "acrux", label: "Acrux" }
    ],
    options: [
      { id: "pos-a", label: "A" },
      { id: "pos-b", label: "B" },
      { id: "pos-c", label: "C" },
      { id: "pos-d", label: "D" }
    ],
    correct: ["pos-b", "pos-d"],
    hints: [
      { text: "Gacrux y Acrux están en las puntas del eje mayor, el palo largo." },
      { text: "Gacrux es la estrella anaranjada de la cabeza de la cruz. Está resaltada.", target: "pos-b" },
      { text: "Acrux es la estrella más brillante y está en el pie de la cruz, del lado del horizonte. Está resaltada.", target: "pos-d" }
    ],
    feedback: {
      correctExplanatory:
        "¡Perfecto! Gacrux está en la cabeza de la cruz y Acrux en el pie. Las dos son los extremos del eje mayor.",
      correctBrief: "¡Correcto! Gacrux arriba y Acrux en el pie.",
      wrongExplanatory: {
        default:
          "Todavía no. Gacrux es la estrella anaranjada de la cabeza y Acrux la más brillante del pie. Las dos están en las puntas del palo largo."
      },
      wrongBrief: "No es la ubicación correcta. Intenta de nuevo."
    },
    defense: "gemelas"
  },
  {
    id: "prolongacion",
    number: 5,
    step: "SEGUIR",
    title: "La prolongación desde Acrux",
    instruction: "¿Qué línea punteada continúa correctamente el eje mayor desde Acrux?",
    scene: "prolongations",
    mode: "single",
    options: [
      { id: "prolongacion-a", label: "Línea A" },
      { id: "prolongacion-b", label: "Línea B" },
      { id: "prolongacion-c", label: "Línea C" }
    ],
    correct: ["prolongacion-a"],
    guidedHighlight: "acrux",
    hints: [
      { text: "La línea-guía comienza en Acrux, la estrella del pie, y sigue en la misma dirección del eje mayor." },
      { text: "Imagina que el palo largo sigue creciendo más allá de Acrux, sin doblar. La línea correcta está resaltada.", target: "prolongacion-a" }
    ],
    feedback: {
      correctExplanatory:
        "¡Muy bien! La línea A sale de Acrux y continúa en la misma dirección del eje mayor, sin doblar.",
      correctBrief: "¡Correcto! Esa es la prolongación.",
      wrongExplanatory: {
        "prolongacion-b": "La línea B sale de Gacrux. La prolongación comienza en Acrux, la estrella del pie.",
        "prolongacion-c": "La línea C sale de Acrux, pero dobla hacia un costado. La prolongación sigue la misma dirección del eje mayor."
      },
      wrongBrief: "No es esa línea. Intenta de nuevo."
    },
    defense: "guia-punteada"
  },
  {
    id: "bajar-horizonte",
    number: 6,
    step: "BAJAR",
    title: "Bajar hasta el horizonte",
    instruction: "Desde el extremo de la línea-guía, ¿qué línea baja correctamente hasta el horizonte?",
    scene: "descents",
    mode: "single",
    options: [
      { id: "bajada-a", label: "Línea A" },
      { id: "bajada-b", label: "Línea B" },
      { id: "bajada-c", label: "Línea C" }
    ],
    correct: ["bajada-b"],
    guidedHighlight: "extremo-guia",
    hints: [
      { text: "La bajada comienza donde termina la línea-guía, no en una estrella." },
      { text: "Desde el extremo de la guía bajamos derecho, en vertical, hasta el horizonte. La línea correcta está resaltada.", target: "bajada-b" }
    ],
    feedback: {
      correctExplanatory:
        "¡Excelente! La línea B baja en vertical desde el extremo de la guía hasta el horizonte.",
      correctBrief: "¡Correcto! Esa es la bajada.",
      wrongExplanatory: {
        "bajada-a": "La línea A baja inclinada. Desde el extremo de la guía bajamos derecho, en vertical.",
        "bajada-c": "La línea C baja desde Acrux. Primero seguimos la guía y bajamos desde su extremo."
      },
      wrongBrief: "No es esa línea. Intenta de nuevo."
    },
    defense: "plomada"
  },
  {
    id: "marcar-sur",
    number: 7,
    step: "BAJAR",
    title: "Marcar el Sur aproximado",
    instruction: "¿Qué punto del horizonte indica la dirección Sur aproximada?",
    scene: "south-points",
    mode: "single",
    options: [
      { id: "punto-a", label: "Punto A" },
      { id: "punto-b", label: "Punto B" },
      { id: "punto-c", label: "Punto C" },
      { id: "punto-d", label: "Punto D" }
    ],
    correct: ["punto-c"],
    guidedHighlight: "bajada",
    hints: [
      { text: "El Sur aproximado está donde la bajada vertical toca el horizonte." },
      { text: "Sigue la bajada con el dedo hasta el suelo. El punto correcto está resaltado.", target: "punto-c" }
    ],
    feedback: {
      correctExplanatory:
        "¡Lo lograste! El punto C está donde la bajada toca el horizonte: esa es la dirección Sur aproximada.",
      correctBrief: "¡Correcto! Ese es el Sur aproximado.",
      wrongExplanatory: {
        "punto-a": "El punto A está debajo de Gacrux. El Sur aproximado está donde la bajada desde la guía toca el horizonte.",
        "punto-b": "El punto B está directamente debajo de Acrux. Primero seguimos la guía y luego bajamos.",
        "punto-d": "El punto D está lejos de la bajada. El Sur aproximado está donde la bajada toca el horizonte."
      },
      wrongBrief: "No es ese punto. Intenta de nuevo."
    },
    defense: "brujula-austral"
  }
];

export const PROCEDURE_STEPS: ProcedureStep[] = ["ENCONTRAR", "SEGUIR", "BAJAR"];
