import { describe, expect, it } from "vitest";
import { ChallengeManager } from "../src/core/ChallengeManager";
import { CHALLENGES } from "../src/core/challenges";
import { DEFENSES } from "../src/core/defenses";
import { difficultyConfigs, type Difficulty } from "../src/core/difficulty";
import { Game } from "../src/core/Game";
import { SYNTHESIS } from "../src/core/synthesis";
import { solveAllChallenges } from "./helpers";

const LEVELS: Difficulty[] = ["beginner", "advanced"];

function newManager(d: Difficulty) {
  return new ChallengeManager(difficultyConfigs[d]);
}

describe("prueba 1: al comenzar siempre se pide elegir nivel", () => {
  it("COMENZAR conduce a ELIGE TU NIVEL, también después de reiniciar o volver al menú", () => {
    const g = new Game(1);
    expect(g.screen).toBe("menu");
    g.start();
    expect(g.screen).toBe("level-select");
    expect(g.difficulty).toBeNull();
    g.selectDifficulty("advanced");
    g.restart();
    expect(g.screen).toBe("level-select");
    expect(g.difficulty).toBeNull();
    g.selectDifficulty("beginner");
    g.backToMenu();
    g.start();
    expect(g.screen).toBe("level-select");
    expect(g.difficulty).toBeNull();
  });

  it("no se puede llegar a los desafíos sin elegir nivel", () => {
    const g = new Game(1);
    expect(() => g.nextChallenge()).toThrow();
    g.start();
    expect(() => g.finishDemo()).toThrow();
  });

  it("después del nivel se anticipa la misión; luego Principiante ve la demostración y Avanzado va al primer desafío", () => {
    const b = new Game(1);
    b.start();
    b.selectDifficulty("beginner");
    expect(b.screen).toBe("mission");
    b.acceptMission();
    expect(b.screen).toBe("demo");
    const a = new Game(1);
    a.start();
    a.selectDifficulty("advanced");
    expect(a.screen).toBe("mission");
    a.acceptMission();
    expect(a.screen).toBe("challenge");
    expect(() => a.acceptMission()).toThrow();
  });
});

describe("pruebas 2 a 5: los dos niveles comparten los mismos problemas", () => {
  it("2. cargan los mismos siete desafíos (mismo objeto, mismo orden)", () => {
    const b = newManager("beginner");
    const a = newManager("advanced");
    expect(b.challenges).toBe(CHALLENGES);
    expect(a.challenges).toBe(CHALLENGES);
    expect(b.challenges.map((c) => c.id)).toEqual([
      "reconocer-cruz",
      "cuatro-estrellas",
      "eje-mayor",
      "gacrux-acrux",
      "prolongacion",
      "bajar-horizonte",
      "marcar-sur"
    ]);
  });

  it("3 y 4. las respuestas correctas, las consignas, las imágenes y las opciones son idénticas", () => {
    const b = newManager("beginner");
    const a = newManager("advanced");
    for (let i = 0; i < 7; i++) {
      expect(b.current.correct).toEqual(a.current.correct);
      expect(b.current.instruction).toBe(a.current.instruction);
      expect(b.current.scene).toBe(a.current.scene);
      expect(b.availableOptions()).toEqual(a.availableOptions());
      expect(b.current.options).toEqual(a.current.options);
      b.submit([...b.current.correct]);
      a.submit([...a.current.correct]);
      b.next();
      a.next();
    }
  });

  it("5. las siete defensas se desbloquean en el mismo orden", () => {
    const orders = LEVELS.map((d) => {
      const g = new Game(3);
      g.start();
      g.selectDifficulty(d);
      solveAllChallenges(g);
      return g.challenges!.unlockedDefenses;
    });
    expect(orders[0]).toEqual(orders[1]);
    expect(orders[0]).toEqual(DEFENSES.map((d) => d.id));
    expect(new Set(orders[0]).size).toBe(7);
  });

  it("un solo intento: un error hace perder el arma, muestra la respuesta y deja el lugar vacío (ambos niveles)", () => {
    for (const d of LEVELS) {
      const cm = newManager(d);
      const wrong = cm.current.options.find((o) => !cm.current.correct.includes(o.id))!.id;
      const r = cm.submit([wrong]);
      expect(r.correct).toBe(false);
      expect(r.lostDefense).toBe("torre-brillo");
      expect(r.correctAnswer).toEqual(["grupo-b"]);
      expect(cm.solved).toBe(true);
      expect(() => cm.submit([...cm.current.correct])).toThrow();
      expect(cm.unlockedDefenses).toEqual([]);
      expect(cm.lostDefenses).toEqual(["torre-brillo"]);
      cm.next();
      expect(cm.current.number).toBe(2);
    }
  });

  it("la batalla usa solo las armas ganadas: los lugares de las perdidas quedan vacíos", () => {
    const g = new Game(4);
    g.start();
    g.selectDifficulty("advanced");
    g.acceptMission();
    const cm = g.challenges!;
    for (let i = 0; i < 7; i++) {
      const ch = cm.current;
      const wrong = ch.options.find((o) => !ch.correct.includes(o.id))!.id;
      // Se equivoca en los desafíos 2 y 5.
      cm.submit(i === 1 || i === 4 ? (ch.mode === "assign" ? [wrong, wrong] : [wrong]) : [...ch.correct]);
      g.nextChallenge();
    }
    expect(g.screen).toBe("synthesis");
    expect(cm.outcomes).toEqual(["won", "lost", "won", "won", "lost", "won", "won"]);
    expect(cm.lostDefenses).toEqual(["cuarteto-luz", "guia-punteada"]);
    g.startBattle();
    const ids = g.battle!.towers.map((t) => t.id);
    expect(ids).toEqual(["torre-brillo", "lanza-eje", "gemelas", "plomada", "brujula-austral"]);
    expect(g.battle!.towers).toHaveLength(5);
  });

  it("si se equivoca en todos, la batalla comienza igual, sin armas", () => {
    const g = new Game(4);
    g.start();
    g.selectDifficulty("beginner");
    g.acceptMission();
    g.finishDemo();
    const cm = g.challenges!;
    for (let i = 0; i < 7; i++) {
      const ch = cm.current;
      const wrong = ch.options.find((o) => !ch.correct.includes(o.id))!.id;
      cm.submit(ch.mode === "assign" ? [wrong, wrong] : [wrong]);
      g.nextChallenge();
    }
    expect(g.screen).toBe("synthesis");
    g.startBattle();
    expect(g.battle!.towers).toHaveLength(0);
  });
});

describe("prueba 6: Principiante muestra ayudas desde el comienzo", () => {
  it("pista disponible sin errores, ilimitada y con elemento resaltado", () => {
    const cm = newManager("beginner");
    expect(cm.isHintAvailable()).toBe(true);
    const targets = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const h = cm.useHint();
      expect(h).not.toBeNull();
      if (h!.target) targets.add(h!.target);
    }
    expect(cm.hintsUsed).toBe(10);
    expect(targets.size).toBeGreaterThan(0);
  });

  it("resalta Acrux cuando la consigna comienza desde esa estrella y usa retroalimentación explicativa", () => {
    const cm = newManager("beginner");
    for (let i = 0; i < 4; i++) {
      cm.submit([...cm.current.correct]);
      cm.next();
    }
    expect(cm.current.id).toBe("prolongacion");
    expect(cm.guidedHighlights()).toContain("acrux");
    const r = cm.submit(["prolongacion-b"]);
    expect(r.feedback).toBe(cm.current.feedback.wrongExplanatory["prolongacion-b"]);
    expect(cm.config.showProcedureSteps).toBe(true);
    expect(cm.config.intenseGuideLine).toBe(true);
    expect(cm.config.axisReminderAnimation).toBe(true);
  });
});

describe("prueba 7: Avanzado no ofrece pistas ni resaltados", () => {
  it("con un solo intento, la pista de Avanzado (que exigía dos errores) no llega a habilitarse", () => {
    const cm = newManager("advanced");
    expect(cm.isHintAvailable()).toBe(false);
    expect(cm.useHint()).toBeNull();
    cm.submit(["grupo-a"]);
    expect(cm.isHintAvailable()).toBe(false);
    expect(cm.availableOptions()).toHaveLength(3);
    expect(cm.guidedHighlights()).toEqual([]);
  });

  it("usa retroalimentación breve y el contador de errores se reinicia en cada desafío", () => {
    const cm = newManager("advanced");
    expect(cm.submit(["grupo-a"]).feedback).toBe(cm.current.feedback.wrongBrief);
    cm.next();
    expect(cm.wrongAttempts).toBe(0);
    expect(cm.isHintAvailable()).toBe(false);
  });
});

describe("prueba 10: la dificultad no puede cambiarse sin reiniciar", () => {
  it("selectDifficulty falla durante los desafíos, la síntesis y la batalla", () => {
    const g = new Game(1);
    g.start();
    g.selectDifficulty("beginner");
    expect(() => g.selectDifficulty("advanced")).toThrow();
    g.acceptMission();
    expect(() => g.selectDifficulty("advanced")).toThrow();
    g.finishDemo();
    expect(() => g.selectDifficulty("advanced")).toThrow();
    solveAllChallenges(g);
    expect(() => g.selectDifficulty("advanced")).toThrow();
    g.startBattle();
    g.pause();
    expect(() => g.selectDifficulty("advanced")).toThrow();
    g.resume();
    expect(g.difficulty).toBe("beginner");
    g.restart();
    g.selectDifficulty("advanced");
    expect(g.difficulty).toBe("advanced");
  });

  it("la pausa detiene la batalla y la reanuda sin cambiar el nivel", () => {
    const g = new Game(1);
    g.start();
    g.selectDifficulty("advanced");
    solveAllChallenges(g);
    g.startBattle();
    const b = g.battle!;
    g.pause();
    const before = b.elapsed;
    b.update(5);
    expect(b.elapsed).toBe(before);
    g.resume();
    b.update(1);
    expect(b.elapsed).toBeGreaterThan(before);
  });
});

describe("prueba 11: la pantalla final muestra el nivel", () => {
  it.each(LEVELS)("resumen en %s", (d) => {
    const g = new Game(5);
    g.start();
    g.selectDifficulty(d);
    const cm = g.challenges!;
    g.acceptMission();
    if (g.screen === "demo") g.finishDemo();
    cm.useHint();
    cm.submit(["grupo-a"]);
    g.nextChallenge();
    for (let i = 1; i < 7; i++) {
      cm.submit([...cm.current.correct]);
      g.nextChallenge();
    }
    g.startBattle();
    const b = g.battle!;
    let t = 0;
    while (!b.isOver && t < 1200) {
      b.update(0.1);
      t += 0.1;
      for (const e of b.drainEvents()) {
        if (e.type === "rescue-triggered") {
          g.rescue!.open();
          g.rescue!.chooseReward("hero");
          g.rescue!.answer(g.rescue!.question!.correctId);
          g.rescue!.finish();
        }
      }
    }
    g.goToFinal();
    const s = g.summary();
    expect(g.screen).toBe("final");
    expect(s.levelMessage).toBe(
      d === "beginner" ? "Completaste el recorrido en nivel Principiante." : "Completaste el recorrido en nivel Avanzado."
    );
    expect(s.challengesCompleted).toBe(7);
    expect(s.attempts).toBe(7);
    expect(s.correctAnswers).toBe(6);
    expect(s.hintsUsed).toBe(d === "beginner" ? 1 : 0);
    expect(s.defenses).toHaveLength(6);
    expect(s.lostDefenses).toEqual(["torre-brillo"]);
    expect(s.zombiesStopped).toBe(b.totalDefeated);
    expect(s.baseEnergy).toBe(b.baseHealth);
    expect(s.rescue.triggered).toBeLessThanOrEqual(3);
  });
});

describe("pruebas 14 y 15: síntesis común y batalla al final", () => {
  it("14. ambos niveles llegan a la misma síntesis conceptual", () => {
    for (const d of LEVELS) {
      const g = new Game(2);
      g.start();
      g.selectDifficulty(d);
      solveAllChallenges(g);
      expect(g.screen).toBe("synthesis");
    }
    expect(SYNTHESIS.steps.map((s) => s.step)).toEqual(["ENCONTRAR", "SEGUIR", "BAJAR"]);
    expect(SYNTHESIS.steps[1].text).toContain("Acrux");
    expect(SYNTHESIS.steps[2].text).toContain("horizonte");
  });

  it("15. la batalla solo comienza después de resolver los siete problemas", () => {
    const g = new Game(2);
    g.start();
    g.selectDifficulty("advanced");
    expect(() => g.startBattle()).toThrow();
    g.acceptMission();
    const cm = g.challenges!;
    for (let i = 0; i < 6; i++) {
      expect(() => g.startBattle()).toThrow();
      cm.submit([...cm.current.correct]);
      g.nextChallenge();
    }
    expect(g.screen).toBe("challenge");
    expect(() => g.startBattle()).toThrow();
    cm.submit([...cm.current.correct]);
    g.nextChallenge();
    expect(g.screen).toBe("synthesis");
    g.startBattle();
    expect(g.screen).toBe("battle");
    expect(g.battle!.towers).toHaveLength(7);
  });
});
