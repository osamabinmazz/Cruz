import { describe, expect, it } from "vitest";
import { DEFENSES } from "../src/core/defenses";
import { Game } from "../src/core/Game";
import { medalsFor } from "../src/core/medals";
import { SLOTS, defaultPlacement, isValidPlacement, placeWeapon, weaponAt } from "../src/core/placement";
import { solveAllChallenges } from "./helpers";

function answerAll(g: Game, wrongAt: number[] = []): void {
  const cm = g.challenges!;
  if (g.screen === "mission") g.acceptMission();
  if (g.screen === "demo") g.finishDemo();
  for (let i = 0; i < 7; i++) {
    const ch = cm.current;
    const wrong = ch.options.find((o) => !ch.correct.includes(o.id))!.id;
    cm.submit(wrongAt.includes(i) ? (ch.mode === "assign" ? [wrong, wrong] : [wrong]) : [...ch.correct]);
    g.nextChallenge();
  }
}

describe("colocar las armas", () => {
  it("la colocación recomendada pone cada arma en el lugar de su desafío", () => {
    const ids = DEFENSES.map((d) => d.id);
    const p = defaultPlacement(ids);
    expect(isValidPlacement(p, ids)).toBe(true);
    DEFENSES.forEach((d, i) => expect(p[d.id]).toBe(i));
  });

  it("colocar en un lugar ocupado intercambia las dos armas", () => {
    const p = defaultPlacement(["torre-brillo", "lanza-eje"]);
    const q = placeWeapon(p, "torre-brillo", 2);
    expect(q["torre-brillo"]).toBe(2);
    expect(q["lanza-eje"]).toBe(0);
    expect(weaponAt(q, 2)).toBe("torre-brillo");
    expect(() => placeWeapon(p, "gemelas", 1)).toThrow();
    expect(() => placeWeapon(p, "torre-brillo", 7)).toThrow();
  });

  it("de la síntesis se pasa a colocar las armas y la batalla las usa en los lugares elegidos", () => {
    const g = new Game(3);
    g.start();
    g.selectDifficulty("advanced");
    answerAll(g, [1]);
    g.goToPlacement();
    expect(g.screen).toBe("placement");
    expect(Object.keys(g.placement!)).toHaveLength(6);
    // La torre va al lugar vacío que dejó el Cuarteto de Luz.
    g.placeWeapon("torre-brillo", 1);
    expect(weaponAt(g.placement!, 0)).toBeNull();
    g.startBattle();
    const torre = g.battle!.towers.find((t) => t.id === "torre-brillo")!;
    expect({ x: torre.x, y: torre.y }).toEqual(SLOTS[1]);
    expect(g.battle!.towers).toHaveLength(6);
  });

  it("reintentar la batalla vuelve a la colocación y conserva la elegida", () => {
    const g = new Game(3);
    g.start();
    g.selectDifficulty("advanced");
    solveAllChallenges(g);
    g.goToPlacement();
    g.placeWeapon("torre-brillo", 6);
    g.startBattle();
    g.battle!.phase = "defeat";
    g.goToFinal();
    g.retryBattle();
    expect(g.screen).toBe("placement");
    expect(g.placement!["torre-brillo"]).toBe(6);
  });
});

describe("guardar la partida", () => {
  it("se retoma en el siguiente desafío sin respuesta, con el mismo nivel y progreso", () => {
    const g = new Game(2);
    g.start();
    g.selectDifficulty("beginner");
    g.acceptMission();
    g.finishDemo();
    const cm = g.challenges!;
    cm.useHint();
    cm.submit([...cm.current.correct]);
    g.nextChallenge();
    cm.submit(["lejana1"]);
    g.nextChallenge();
    const data = JSON.parse(JSON.stringify(g.snapshot()));

    const h = new Game(9);
    h.restore(data);
    expect(h.difficulty).toBe("beginner");
    expect(h.screen).toBe("challenge");
    expect(h.challenges!.current.number).toBe(3);
    expect(h.challenges!.outcomes).toEqual(["won", "lost"]);
    expect(h.challenges!.unlockedDefenses).toEqual(["torre-brillo"]);
    expect(h.challenges!.lostDefenses).toEqual(["cuarteto-luz"]);
    expect(h.challenges!.hintsUsed).toBe(1);
    expect(() => h.selectDifficulty("advanced")).toThrow();
  });

  it("una batalla en curso se retoma desde la colocación de armas, sin repetir preguntas de rescate", () => {
    const g = new Game(2);
    g.start();
    g.selectDifficulty("advanced");
    solveAllChallenges(g);
    g.goToPlacement();
    g.placeWeapon("plomada", 0);
    g.startBattle();
    g.bank!.draw("easy");
    const data = g.snapshot()!;
    expect(data.stage).toBe("placement");

    const h = new Game(5);
    h.restore(data);
    expect(h.screen).toBe("placement");
    expect(h.placement!["plomada"]).toBe(0);
    expect([...h.bank!.used]).toEqual([...g.bank!.used]);
  });

  it("no hay nada que guardar en el menú ni en la pantalla final", () => {
    const g = new Game(1);
    expect(g.snapshot()).toBeNull();
    g.start();
    expect(g.snapshot()).toBeNull();
  });
});

describe("medallas personales", () => {
  it("reconocen lo logrado sin comparar con nadie", () => {
    const g = new Game(4);
    g.start();
    g.selectDifficulty("beginner");
    answerAll(g, [2]);
    g.startBattle();
    g.battle!.phase = "victory";
    g.goToFinal();
    const medals = Object.fromEntries(medalsFor(g.summary()).map((m) => [m.id, m.earned]));
    expect(medals).toMatchObject({
      explorador: true,
      "ojo-lince": false,
      "maestro-eje": false,
      "camino-sur": true,
      guardian: true,
      intacto: true,
      rescatista: false,
      "amigo-estrellas": false
    });
  });
});
