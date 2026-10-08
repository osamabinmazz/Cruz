import type { CampaignSave } from "../core/campaign/Campaign";
import { levelName } from "../core/difficulty";
import { studentRow } from "../core/teacher";

/**
 * Guarda diplomas y reportes como PDF sin librerías ni internet: cada página se
 * dibuja en un canvas, se convierte en JPEG y se incluye en un PDF mínimo.
 */

export interface PdfPage {
  canvas: HTMLCanvasElement;
  /** Tamaño de la página en puntos (1/72 de pulgada). */
  width: number;
  height: number;
}

const enc = new TextEncoder();

function jpegBytes(canvas: HTMLCanvasElement): Uint8Array {
  const data = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function pagesToPdf(pages: PdfPage[]): Blob {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    parts.push(u);
    length += u.length;
  };
  const obj = (n: number, body: (Uint8Array | string)[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  const pageIds = pages.map((_, i) => 3 + i * 3);
  obj(2, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`]);
  pages.forEach((p, i) => {
    const page = 3 + i * 3;
    const content = page + 1;
    const image = page + 2;
    obj(page, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.width} ${p.height}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`]);
    const draw = `q ${p.width} 0 0 ${p.height} 0 0 cm /Im0 Do Q`;
    obj(content, [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`]);
    const jpg = jpegBytes(p.canvas);
    obj(image, [`<< /Type /XObject /Subtype /Image /Width ${p.canvas.width} /Height ${p.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, "\nendstream"]);
  });
  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FONT = "system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Parte un texto en líneas que quepan en `maxWidth`. */
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

const fmtDate = (t: number) => new Date(t).toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });

/** Diploma en una hoja A4 horizontal. */
export function diplomaPdf(save: CampaignSave): Blob {
  const W = 1684;
  const H = 1190;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const r = studentRow(save);
  const done = save.stage === "finished";
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
  ctx.fillText("CRUZ DEL SUR · LA CAMPAÑA DE LAS NOCHES", W / 2, 250);
  ctx.fillStyle = "#7a4f0a";
  ctx.font = `bold 120px ${FONT}`;
  ctx.fillText(done ? "DIPLOMA" : "RECONOCIMIENTO", W / 2, 400);
  ctx.fillStyle = "#2b2140";
  ctx.font = `36px ${FONT}`;
  ctx.fillText(done ? "Se otorga a" : "Se reconoce a", W / 2, 480);
  ctx.font = `bold 96px ${FONT}`;
  let name = save.name;
  while (ctx.measureText(name).width > W - 400 && name.length > 3) name = name.slice(0, -1);
  ctx.fillText(name, W / 2, 590);
  ctx.fillRect(W / 2 - ctx.measureText(name).width / 2 - 20, 612, ctx.measureText(name).width + 40, 4);
  ctx.font = `36px ${FONT}`;
  const text = done
    ? "por completar las cinco noches y aprender a encontrar el Sur aproximado con la Cruz del Sur: encontrar la cruz, seguir su eje mayor y bajar hasta el horizonte."
    : `por su avance en la campaña (${r.progress}) aprendiendo a encontrar el Sur aproximado con la Cruz del Sur.`;
  wrap(ctx, text, W - 480).forEach((line, i) => ctx.fillText(line, W / 2, 690 + i * 50));
  ctx.font = `30px ${FONT}`;
  ctx.fillText(`${r.nightsWon} noches ganadas   ·   ${r.accuracy}% de acierto   ·   ${r.stopped} zombis detenidos   ·   Nivel ${levelName(save.difficulty)}`, W / 2, 870);
  ctx.font = `30px ${FONT}`;
  ctx.fillText(fmtDate(Date.now()), W / 2, 960);
  ctx.fillRect(W - 560, 1010, 360, 3);
  ctx.font = `26px ${FONT}`;
  ctx.fillText("Docente", W - 380, 1050);
  return pagesToPdf([{ canvas: c, width: 842, height: 595 }]);
}

/** Reporte de la clase en hojas A4 verticales (unas 22 filas por hoja). */
export function reportPdf(saves: readonly CampaignSave[], teamOf: (name: string) => string): Blob {
  const W = 1240;
  const H = 1754;
  const perPage = 22;
  const chunks: CampaignSave[][] = [];
  for (let i = 0; i < Math.max(1, saves.length); i += perPage) chunks.push(saves.slice(i, i + perPage));
  const pages: PdfPage[] = chunks.map((chunk, pi) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1b2a63";
    ctx.textAlign = "left";
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText("Cruz del Sur · Reporte de la clase", 70, 100);
    ctx.fillStyle = "#555";
    ctx.font = `24px ${FONT}`;
    ctx.fillText(`${fmtDate(Date.now())} · ${saves.length} estudiante${saves.length === 1 ? "" : "s"} · página ${pi + 1} de ${chunks.length}`, 70, 142);
    const cols: [string, number][] = [["Estudiante", 70], ["Equipo", 330], ["Nivel", 490], ["Avance", 640], ["Noches", 780], ["Aciertos", 870], ["Le costó", 1085]];
    ctx.fillStyle = "#1b2a63";
    ctx.fillRect(60, 175, W - 120, 44);
    ctx.fillStyle = "#fff";
    ctx.font = `bold 22px ${FONT}`;
    for (const [h, x] of cols) ctx.fillText(h, x, 205);
    ctx.font = `22px ${FONT}`;
    chunk.forEach((s, i) => {
      const r = studentRow(s);
      const y = 252 + i * 64;
      ctx.fillStyle = i % 2 ? "#fff" : "#eef1fb";
      ctx.fillRect(60, y - 30, W - 120, 64);
      ctx.fillStyle = "#222";
      const cut = (t: string, w: number) => {
        let u = t;
        while (ctx.measureText(u).width > w && u.length > 2) u = u.slice(0, -1);
        return u === t ? t : `${u}…`;
      };
      const cells = [cut(r.name, 240), cut(teamOf(s.name) || "—", 150), r.level, r.progress, `${r.nightsWon}/5`, `${r.correct}✓ ${r.incorrect}✗ (${r.accuracy}%)`, r.struggled.length ? r.struggled.map((n) => `D${n}`).join(" ") : "—"];
      cols.forEach(([, x], k) => ctx.fillText(cells[k], x, y));
    });
    if (saves.length === 0) {
      ctx.fillStyle = "#555";
      ctx.fillText("Todavía no hay estudiantes.", 70, 270);
    }
    return { canvas: c, width: 595, height: 842 };
  });
  return pagesToPdf(pages);
}
