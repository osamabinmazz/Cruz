import { describe, expect, it } from "vitest";
import { cycleNight, endlessScale, endlessWaves } from "../src/core/endless";

describe("noches sin fin", () => {
  it("el mapa y el clima dan la vuelta cada cinco noches", () => {
    expect([1, 2, 5, 6, 10, 11].map(cycleNight)).toEqual([1, 2, 5, 1, 5, 1]);
  });
  it("cada noche es más grande y siempre igual para la misma noche", () => {
    const total = (e: number) => endlessWaves(e).reduce((n, w) => n + w.length, 0);
    expect(total(5)).toBeGreaterThan(total(1));
    expect(total(12)).toBeGreaterThan(total(5));
    expect(endlessWaves(7)).toEqual(endlessWaves(7));
  });
  it("los zombis nuevos aparecen poco a poco y el gigante cada cinco noches", () => {
    const kinds = (e: number) => new Set(endlessWaves(e).flat());
    expect(kinds(1).has("resistente")).toBe(false);
    expect(kinds(4).has("doble")).toBe(true);
    expect(kinds(1).has("gigante")).toBe(false);
    expect(endlessWaves(5).at(-1)!.at(-1)).toBe("gigante");
    expect(endlessWaves(10).at(-1)!.at(-1)).toBe("gigante");
  });
  it("los zombis se refuerzan pero la velocidad tiene tope", () => {
    expect(endlessScale(1)).toEqual({ health: 1, speed: 1 });
    expect(endlessScale(11).health).toBeCloseTo(2);
    expect(endlessScale(100).speed).toBe(1.35);
  });
});
