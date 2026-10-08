import { describe, expect, it } from "vitest";
import { Campaign } from "../src/core/campaign/Campaign";
import { MAPS } from "../src/core/battle/maps";
import { Game } from "../src/core/Game";
import { MAX_CARRIED } from "../src/core/placement";

function newGame(difficulty: "beginner" | "advanced" = "beginner") {
  const g = new Game(5);
  g.openStudents();
  g.openNewStudent();
  g.createStudent("Ana", difficulty);
  return g;
}

/** Responde los desafíos de la noche; `wrong` indica cuáles (por posición) se responden mal. */
function answerNight(g: Game, wrong: number[] = []): void {
  g.startNight();
  if (g.screen === "story") g.beginNightChallenges();
  const cm = g.challenges!;
  for (let i = 0; i < cm.challenges.length; i++) {
    const answer = wrong.includes(i) ? ["__mal__"] : [...cm.current.correct];
    g.submitAnswer(answer);
    g.nextChallenge();
  }
}

function winNight(g: Game): void {
  g.startBattle();
  g.battle!.phase = "victory";
  g.goToFinal();
}

describe("campaña: recorrido de pantallas", () => {
  it("menú → estudiantes → nuevo estudiante → noches", () => {
    const g = new Game(1);
    g.openStudents();
    expect(g.screen).toBe("students");
    g.openNewStudent();
    expect(g.screen).toBe("new-student");
    const c = g.createStudent("  Luz  ", "advanced");
    expect(c.name).toBe("Luz");
    expect(g.screen).toBe("nights");
    expect(g.difficulty).toBe("advanced");
    expect(g.campaign).toBe(c);
  });

  it("la noche 1 cuenta la historia, trae dos desafíos y pasa a colocar las armas", () => {
    const g = newGame();
    g.startNight();
    expect(g.screen).toBe("story");
    g.beginNightChallenges();
    expect(g.screen).toBe("challenge");
    expect(g.challenges!.challenges).toHaveLength(2);
    g.submitAnswer([...g.challenges!.current.correct]);
    g.nextChallenge();
    g.submitAnswer([...g.challenges!.current.correct]);
    g.nextChallenge();
    expect(g.screen).toBe("placement");
    expect(g.campaign!.weapons).toHaveLength(2);
    expect(Object.keys(g.placement!)).toHaveLength(2);
  });

  it("las respuestas quedan registradas en la campaña, bien o mal", () => {
    const g = newGame();
    answerNight(g, [1]);
    expect(g.campaign!.data.log.map((e) => e.correct)).toEqual([true, false]);
    expect(g.campaign!.weapons).toHaveLength(1);
    expect(g.campaign!.data.lost).toHaveLength(1);
  });

  it("la batalla usa el mapa de la noche, las armas y los puestos elegidos", () => {
    const g = newGame();
    g.campaign!.data.dust = 100;
    g.campaign!.buyPost();
    answerNight(g);
    expect(g.availableItems).toHaveLength(3);
    g.startBattle();
    expect(g.screen).toBe("battle");
    expect(g.battle!.map).toBe(MAPS.bosque);
    expect(g.battle!.towers).toHaveLength(2);
    expect(g.battle!.posts).toHaveLength(1);
    expect(g.battle!.totalWaves).toBe(2);
  });

  it("ganar la noche: resumen, taller, y la noche siguiente empieza con el repaso del arma perdida", () => {
    const g = newGame();
    answerNight(g, [0]);
    winNight(g);
    expect(g.screen).toBe("night-result");
    expect(g.nightResult!.victory).toBe(true);
    g.leaveNightResult();
    expect(g.screen).toBe("workshop");
    g.leaveWorkshop();
    expect(g.screen).toBe("nights");
    expect(g.campaign!.night).toBe(2);
    g.startNight();
    g.beginNightChallenges();
    const list = g.challenges!.challenges;
    expect(list).toHaveLength(3);
    expect(g.campaign!.isReview(list[0])).toBe(true);
  });

  it("perder la noche: taller y vuelve a colocar las armas para repetir la misma batalla", () => {
    const g = newGame();
    answerNight(g);
    g.startBattle();
    g.battle!.phase = "defeat";
    g.goToFinal();
    expect(g.nightResult!.victory).toBe(false);
    g.leaveNightResult();
    g.leaveWorkshop();
    expect(g.screen).toBe("placement");
    expect(g.campaign!.night).toBe(1);
    g.startBattle();
    expect(g.screen).toBe("battle");
    expect(g.campaign!.nightOutcomes()).toHaveLength(2);
  });

  it("el taller sube armas y puestos con el polvo ganado", () => {
    const g = newGame();
    answerNight(g);
    winNight(g);
    g.leaveNightResult();
    const dust = g.campaign!.dust;
    expect(dust).toBeGreaterThan(30);
    const id = g.campaign!.weapons[0];
    g.upgradeWeapon(id);
    expect(g.campaign!.level(id)).toBe(2);
    expect(g.campaign!.dust).toBe(dust - 30);
  });

  it("ganar la noche final lleva al cierre de la campaña", () => {
    const g = newGame();
    for (let n = 1; n <= 5; n++) {
      answerNight(g);
      winNight(g);
      if (n < 5) {
        g.leaveNightResult();
        g.leaveWorkshop();
      }
    }
    g.leaveNightResult();
    expect(g.screen).toBe("campaign-final");
    expect(g.campaign!.isFinished).toBe(true);
  });

  it("retomar a medias: los desafíos ya respondidos no se repiten", () => {
    const g = newGame();
    g.startNight();
    g.beginNightChallenges();
    g.submitAnswer([...g.challenges!.current.correct]);
    const save = JSON.parse(JSON.stringify(g.campaignSnapshot()));

    const again = new Game(9);
    again.enterCampaign(Campaign.fromSave(save));
    expect(again.screen).toBe("nights");
    again.startNight();
    expect(again.screen).toBe("challenge");
    expect(again.challenges!.index).toBe(1);
    expect(again.challenges!.outcomes).toEqual(["won"]);
  });

  it("retomar con la noche respondida lleva directo a la colocación", () => {
    const g = newGame();
    answerNight(g);
    const save = JSON.parse(JSON.stringify(g.campaignSnapshot()));
    const again = new Game(9);
    again.enterCampaign(Campaign.fromSave(save));
    again.startNight();
    expect(again.screen).toBe("placement");
  });
});

describe("campaña: colocación eligiendo qué llevar", () => {
  function gameWithManyItems() {
    const g = newGame();
    g.campaign!.data.dust = 500;
    g.campaign!.buyPost();
    g.campaign!.buyPost();
    // Simula una campaña avanzada: seis armas ganadas.
    g.campaign!.data.unlocked.push("torre-brillo", "cuarteto-luz", "lanza-eje", "gemelas", "guia-punteada", "plomada");
    g.campaign!.data.night = 5;
    g.startNight();
    g.beginNightChallenges();
    return g;
  }

  it("con más cosas que lugares, se llevan las armas y el resto queda en reserva", () => {
    const g = gameWithManyItems();
    expect(g.screen).toBe("placement");
    expect(g.availableItems).toHaveLength(8);
    expect(Object.keys(g.placement!)).toHaveLength(MAX_CARRIED);
    expect(Object.keys(g.placement!).some((id) => id.startsWith("puesto"))).toBe(true);
  });

  it("poner un puesto en un lugar ocupado manda al arma a la reserva; se puede sacar y volver a poner", () => {
    const g = gameWithManyItems();
    const placed = () => Object.keys(g.placement!);
    expect(placed()).toContain("torre-brillo");
    g.putItem("puesto-2", g.placement!["torre-brillo"]!);
    expect(placed()).not.toContain("torre-brillo");
    expect(placed()).toHaveLength(MAX_CARRIED);
    g.stashItem("puesto-2");
    expect(placed()).toHaveLength(MAX_CARRIED - 1);
    g.putItem("torre-brillo", 0);
    expect(placed()).toContain("torre-brillo");
    expect(() => g.putItem("brujula-austral", 0)).toThrow();
  });

  it("al reiniciar la colocación vuelve la recomendada", () => {
    const g = gameWithManyItems();
    g.stashItem("torre-brillo");
    g.resetPlacement();
    expect(Object.keys(g.placement!)).toContain("torre-brillo");
  });
});

describe("campaña: volver a convocar guardianes en la batalla", () => {
  function inBattle() {
    const g = newGame();
    g.campaign!.data.dust = 200;
    g.campaign!.buyPost();
    answerNight(g);
    g.startBattle();
    return g;
  }

  it("no se puede si la estrellita no cayó", () => {
    const g = inBattle();
    expect(g.summonGuardian("puesto-1", 0)).toBe(false);
  });

  it("cuesta 3 de polvo, y sin polvo no se puede", () => {
    const g = inBattle();
    g.battle!.posts[0].guardians[0].state = "down";
    const dust = g.campaign!.dust;
    expect(g.summonGuardian("puesto-1", 0)).toBe(true);
    expect(g.campaign!.dust).toBe(dust - 3);
    expect(g.battle!.posts[0].guardians[0].state).toBe("alive");

    g.battle!.posts[0].guardians[1].state = "down";
    g.campaign!.data.dust = 2;
    expect(g.summonGuardian("puesto-1", 1)).toBe(false);
    expect(g.campaign!.dust).toBe(2);
    expect(g.battle!.posts[0].guardians[1].state).toBe("down");
  });
});

describe("la partida rápida sigue como en la 1.0", () => {
  it("no tiene campaña y pasa por la síntesis", () => {
    const g = new Game(3);
    g.start();
    g.selectDifficulty("beginner");
    expect(g.campaign).toBeNull();
    g.acceptMission();
    g.finishDemo();
    for (let i = 0; i < 7; i++) {
      g.challenges!.submit([...g.challenges!.current.correct]);
      g.nextChallenge();
    }
    expect(g.screen).toBe("synthesis");
  });
});
