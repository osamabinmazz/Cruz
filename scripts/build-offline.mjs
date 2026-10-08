// Crea la versión sin conexión: un solo archivo HTML con el juego completo
// (código y estilos incluidos) y un .zip para descargar. Se ejecuta después de
// `vite build` y deja ambos dentro de dist/.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");
let html = readFileSync(join(dist, "index.html"), "utf8");

html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/g, (_, file) => {
  const js = readFileSync(join(dist, file), "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/g, (_, file) => {
  return `<style>${readFileSync(join(dist, file), "utf8")}</style>`;
});
if (/assets\//.test(html)) throw new Error("Quedó un archivo sin incluir en la versión sin conexión.");

const work = join(dist, "sin-conexion");
rmSync(work, { recursive: true, force: true });
mkdirSync(work);
writeFileSync(join(work, "cruz-del-sur.html"), html);
writeFileSync(
  join(work, "LEEME.txt"),
  [
    "CRUZ DEL SUR 2.0: LA CAMPAÑA DE LAS NOCHES",
    "",
    "Para jugar sin internet, abre el archivo cruz-del-sur.html con un navegador",
    "(Chrome, Edge, Firefox o Safari). No hace falta instalar nada.",
    "Deja la carpeta \"voz\" junto al archivo: ahí está la voz de Acrux.",
    "",
    "La partida se guarda en ese navegador y en ese computador.",
    ""
  ].join("\r\n")
);
// La voz de Acrux va en una carpeta junto al archivo (los audios se cargan de ahí).
if (existsSync(join(dist, "voz"))) cpSync(join(dist, "voz"), join(work, "voz"), { recursive: true });
rmSync(join(dist, "cruz-del-sur.zip"), { force: true });
execFileSync("zip", ["-q", "-r", join(dist, "cruz-del-sur.zip"), "cruz-del-sur.html", "LEEME.txt", ...(existsSync(join(work, "voz")) ? ["voz"] : [])], { cwd: work });
rmSync(work, { recursive: true, force: true });
console.log("Versión sin conexión lista: dist/cruz-del-sur.zip");
