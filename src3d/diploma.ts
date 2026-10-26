import { levelName } from "../src/core/difficulty";
import { studentRow3, type Student3 } from "../src/core/students3d";
import { downloadBlob, pagesToPdf } from "../src/ui/pdf";
import { ico } from "./icons";

const FONT = "system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (t: number) => new Date(t).toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

const textOf = (s: Student3) =>
  s.finished
    ? "por resistir las cinco noches, vencer al gigante y aprender a orientarse con la Cruz del Sur, el Sol y los puntos cardinales."
    : `por su avance en la isla (${studentRow3(s).progress.toLowerCase()}) aprendiendo a orientarse con la Cruz del Sur, el Sol y los puntos cardinales.`;

/** Diploma en una hoja A4 horizontal (o reconocimiento, si todavía no termina). */
export function diploma3Pdf(s: Student3): Blob {
  const W = 1684;
  const H = 1190;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const r = studentRow3(s);
  const g = ctx.createRadialGradient(W / 2, 0, 100, W / 2, H / 2, W * 0.8);
  g.addColorStop(0, "#fff8dc");
  g.addColorStop(1, "#f1dd9c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#b8862b";
  ctx.lineWidth = 14;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.lineWidth = 4;
  ctx.strokeRect(68, 68, W - 136, H - 136);
  ctx.textAlign = "center";
  ctx.fillStyle = "#d49a1a";
  ctx.font = `bold 70px ${FONT}`;
  ctx.fillText("✦", W / 2, 190);
  ctx.fillStyle = "#2b2140";
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText("CRUZ DEL SUR 3.0 · LA ISLA DE LAS NOCHES", W / 2, 250);
  ctx.fillStyle = "#7a4f0a";
  ctx.font = `bold 120px ${FONT}`;
  ctx.fillText(s.finished ? "DIPLOMA" : "RECONOCIMIENTO", W / 2, 400);
  ctx.fillStyle = "#2b2140";
  ctx.font = `36px ${FONT}`;
  ctx.fillText(s.finished ? "Se otorga a" : "Se reconoce a", W / 2, 480);
  ctx.font = `bold 96px ${FONT}`;
  let name = s.name;
  while (ctx.measureText(name).width > W - 400 && name.length > 3) name = name.slice(0, -1);
  ctx.fillText(name, W / 2, 590);
  ctx.fillRect(W / 2 - ctx.measureText(name).width / 2 - 20, 612, ctx.measureText(name).width + 40, 4);
  ctx.font = `36px ${FONT}`;
  wrap(ctx, textOf(s), W - 480).forEach((line, i) => ctx.fillText(line, W / 2, 690 + i * 50));
  ctx.font = `30px ${FONT}`;
  ctx.fillText(`${r.nightsWon} noches ganadas   ·   ${r.accuracy}% de acierto   ·   ${r.stopped} zombis detenidos   ·   Nivel ${levelName(s.level)}`, W / 2, 870);
  ctx.fillText(fmtDate(Date.now()), W / 2, 960);
  ctx.fillRect(W - 560, 1010, 360, 3);
  ctx.font = `26px ${FONT}`;
  ctx.fillText("Docente", W - 380, 1050);
  return pagesToPdf([{ canvas: c, width: 842, height: 595 }]);
}

export function saveDiploma(s: Student3): void {
  downloadBlob(diploma3Pdf(s), `diploma-${s.name.replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf`);
}

/** Pantalla del diploma. `onBack` vuelve a donde estaba el estudiante. */
export function showDiploma(root: HTMLElement, s: Student3, onBack: () => void): void {
  const r = studentRow3(s);
  const el = document.createElement("div");
  el.className = "overlay diploma-wrap";
  el.innerHTML = `<div class="diploma3">
    <div class="d-star">${ico("dust", 54, "gold")}</div>
    <p class="d-kicker">CRUZ DEL SUR 3.0 · LA ISLA DE LAS NOCHES</p>
    <h1>${s.finished ? "DIPLOMA" : "RECONOCIMIENTO"}</h1>
    <p>${s.finished ? "Se otorga a" : "Se reconoce a"}</p>
    <p class="d-name">${esc(s.name)}</p>
    <p>${esc(textOf(s))}</p>
    <div class="d-stats"><span><b>${r.nightsWon}</b> noches ganadas</span><span><b>${r.accuracy}%</b> de acierto</span><span><b>${r.stopped}</b> zombis detenidos</span><span>Nivel <b>${levelName(s.level)}</b></span></div>
    <p class="d-date">${fmtDate(Date.now())}</p>
  </div>
  <div class="row"><button class="btn primary" data-pdf>Guardar PDF</button><button class="btn" data-back>Volver</button></div>`;
  el.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-pdf]")) saveDiploma(s);
    else if (t.closest("[data-back]")) {
      el.remove();
      onBack();
    }
  });
  root.appendChild(el);
}
