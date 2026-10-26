import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK3, isStudent3, newStudent, recordAnswer, recordNight, rank3, studentKey3, studentRow3, toCsv3 } from "../src/core/students3d";

const win = (night: number) => ({ night, victory: true, kills: 5, stopped: 20, chestsOpened: 2, chestsMissed: 1, downs: 0 });
const loss = (night: number) => ({ night, victory: false, kills: 1, stopped: 3, chestsOpened: 0, chestsMissed: 0, downs: 2 });

describe("estudiantes de la 3.0", () => {
  it("empieza en el día 1 con tres armas", () => {
    const s = newStudent("  Ana  María ", "beginner", DEFAULT_LOOK3, 5);
    expect(s.name).toBe("Ana María");
    expect(s.night).toBe(1);
    expect(s.hand).toHaveLength(3);
    expect(isStudent3(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(isStudent3({ version: 2 })).toBe(false);
  });
  it("la clave no cambia por mayúsculas ni tildes", () => {
    expect(studentKey3("  ÁNA  ")).toBe(studentKey3("ana"));
  });
  it("ganar avanza de día y la quinta noche termina", () => {
    const s = newStudent("Leo", "advanced", DEFAULT_LOOK3);
    recordNight(s, win(1));
    expect(s.night).toBe(2);
    recordNight(s, loss(2));
    expect(s.night).toBe(2);
    for (const n of [2, 3, 4, 5]) recordNight(s, win(n));
    expect(s.finished).toBe(true);
    expect(studentRow3(s).progress).toBe("Terminada");
    expect(studentRow3(s).nightsWon).toBe(5);
  });
  it("en Extremo cada derrota suaviza y ganar lo reinicia", () => {
    const s = newStudent("Eva", "extreme", DEFAULT_LOOK3);
    recordNight(s, loss(1));
    recordNight(s, loss(1));
    expect(s.ease).toBe(2);
    recordNight(s, win(1));
    expect(s.ease).toBe(0);
    const b = newStudent("Bo", "beginner", DEFAULT_LOOK3);
    recordNight(b, loss(1));
    expect(b.ease).toBe(0);
  });
  it("calcula el acierto por tema y marca el que hay que reforzar", () => {
    const s = newStudent("Ida", "beginner", DEFAULT_LOOK3);
    for (let i = 0; i < 4; i++) recordAnswer(s, { topic: "sol", correct: i === 0, usedHint: false });
    for (let i = 0; i < 4; i++) recordAnswer(s, { topic: "cruz", correct: true, usedHint: false });
    const r = studentRow3(s);
    expect(r.accuracy).toBe(63);
    expect(r.weakest).toBe("El Sol");
    expect(r.topics.find((t) => t.topic === "cardinales")!.total).toBe(0);
  });
  it("ordena por puntos y exporta CSV con comillas", () => {
    const a = newStudent('Ana "la" mejor', "beginner", DEFAULT_LOOK3);
    recordAnswer(a, { topic: "cruz", correct: true, usedHint: false });
    recordNight(a, win(1));
    const b = newStudent("Zoe", "beginner", DEFAULT_LOOK3);
    expect(rank3([b, a])[0].name).toBe('Ana "la" mejor');
    const csv = toCsv3([a, b]);
    expect(csv.split("\n")).toHaveLength(3);
    expect(csv).toContain('"Ana ""la"" mejor"');
  });
});
