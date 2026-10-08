import { describe, expect, it } from "vitest";
import { Campaign } from "../src/core/campaign/Campaign";
import { challengeStats, rankStudents, rankTeams, studentRow, toCsv } from "../src/core/teacher";

function student(name: string, wins: number, right: number, wrong: number) {
  const c = Campaign.create(name, "advanced", 1000);
  const d = c.data;
  for (let i = 0; i < right; i++) d.log.push({ night: 1, challengeId: "reconocer-cruz", defense: "torre-brillo", correct: true, review: false, at: i });
  for (let i = 0; i < wrong; i++) d.log.push({ night: 1, challengeId: "eje-mayor", defense: "lanza-eje", correct: false, review: false, at: i });
  for (let n = 1; n <= wins; n++) d.nightResults.push({ night: n, victory: true, stopped: 10, baseEnergy: 100, rescuesCorrect: 0, dustEarned: 20, dustCollected: 0 });
  return d;
}
const key = (n: string) => n.toLowerCase();

describe("panel del docente", () => {
  it("resume a cada estudiante", () => {
    const r = studentRow(student("Ana", 2, 3, 1));
    expect(r).toMatchObject({ name: "Ana", level: "Avanzado", nightsWon: 2, correct: 3, incorrect: 1, accuracy: 75, stopped: 20 });
    expect(r.score).toBe(3 * 10 + 2 * 50 + 20 * 2);
    expect(r.struggled).toEqual([3]);
  });
  it("mide cómo le fue al grupo en cada desafío", () => {
    const stats = challengeStats([student("A", 0, 2, 0), student("B", 0, 0, 2)]);
    expect(stats[0]).toMatchObject({ number: 1, answers: 2, accuracy: 100 });
    expect(stats[2]).toMatchObject({ number: 3, answers: 2, accuracy: 0 });
    expect(stats[4].accuracy).toBeNull();
  });
  it("ordena estudiantes y equipos por puntaje", () => {
    const a = student("Ana", 3, 5, 0);
    const b = student("Beto", 0, 1, 2);
    const c = student("Cami", 1, 2, 0);
    expect(rankStudents([b, a, c]).map((s) => s.name)).toEqual(["Ana", "Cami", "Beto"]);
    const teams = rankTeams([a, b, c], { Rojos: ["beto", "cami"], Azules: ["ana"] }, key);
    expect(teams.map((t) => t.team)).toEqual(["Azules", "Rojos"]);
    expect(teams[1].members.map((m) => m.name)).toEqual(["Beto", "Cami"]);
  });
  it("el CSV lleva encabezado, tildes (BOM), equipo y evita fórmulas", () => {
    const csv = toCsv([student("=Hack", 1, 1, 0), student("Ana, la \"grande\"", 0, 0, 0)], (n) => (n === "Ana, la \"grande\"" ? "Rojos" : ""));
    expect(csv.startsWith("﻿Nombre,Equipo,Nivel")).toBe(true);
    expect(csv).toContain("'=Hack");
    expect(csv).toContain('"Ana, la ""grande"""');
    expect(csv.trim().split("\r\n")).toHaveLength(3);
  });
});
