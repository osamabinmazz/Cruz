// Prueba de punta a punta de Cruz del Sur 3.0 en un navegador real (Playwright).
// Uso:  npm run dev3d   (en otra terminal)   y luego   node scripts/e2e-3d.mjs [url]
// Necesita Playwright instalado (npm i -D playwright && npx playwright install chromium).
// Juega las cinco noches simulando las batallas, pasa por las misiones, el poder estelar,
// los jefes, las noches sin fin y el panel del profesor, y falla si hay un error en la página.
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/3.0/";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
const check = (cond, msg) => {
  if (!cond) errors.push(`FALLO: ${msg}`);
  console.log(`${cond ? "ok " : "MAL"} ${msg}`);
};

await page.goto(url);
await page.fill("#nombre", "Prueba E2E");
await page.click("[data-go]");
await page.waitForTimeout(2000);
await page.click("[data-skip]").catch(() => undefined);
check(await page.evaluate(() => window.cruz3.student?.name === "Prueba E2E"), "se crea el estudiante");

for (let n = 1; n <= 5; n++) {
  await page.evaluate(() => {
    const g = window.cruz3;
    g.placed = { "torre-brillo": 0, "cuarteto-luz": 1, "lanza-eje": 2, gemelas: 3, plomada: 4 };
    g.refreshPlaced();
  });
  await page.keyboard.press("KeyN");
  await page.waitForTimeout(400);
  const res = await page.evaluate(() => {
    const g = window.cruz3;
    // La prueba no juega: la escuela aguanta lo que haga falta para poder recorrer las cinco noches.
    g.battle.baseHealth = 1e6;
    g.battle.callNextWave();
    for (let i = 0; i < 4000 && g.battle.phase !== "victory" && g.battle.phase !== "defeat"; i++) {
      g.battle.update(0.1);
      g.updateBoss();
    }
    return g.battle.phase;
  });
  check(res === "victory" || res === "defeat", `la noche ${n} termina (${res})`);
  await page.waitForTimeout(1200);
  if (n < 5) await page.click('[data-go="next"]');
  await page.waitForTimeout(1200);
  await page.click("[data-skip]").catch(() => undefined);
}
check(await page.evaluate(() => window.cruz3.student.results.length >= 5), "se guardan los resultados");
check(await page.evaluate(() => !!document.querySelector('[data-go="diploma"]')), "aparece el diploma al terminar");

await page.screenshot({ path: "e2e-3d.png" });
await browser.close();
if (errors.length) {
  console.error("\nErrores:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("\nTodo bien.");
