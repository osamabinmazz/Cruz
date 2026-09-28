import type { Challenge } from "../core/challenges";
import { CROSS, EXTRA_STARS, GUIDE_END, SKY, SOUTH_POINT, below, rotate, type Point } from "../core/geometry";
import type { RescueVisual } from "../core/rescue/questions";

/** Estado visual de una escena de desafío. */
export interface SceneState {
  selected: string[];
  assignment: Record<string, string>;
  highlights: Set<string>;
  removed: Set<string>;
  intenseGuide: boolean;
  axisReminder: boolean;
  /** Muestra la respuesta correcta después de resolver. */
  solved: boolean;
}

const W = SKY.width;
const H = SKY.height;
const HY = SKY.horizonY;

function f(n: number): string {
  return n.toFixed(1);
}

function backgroundStars(seed = 7, count = 46): string {
  let s = seed;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * (HY - 10);
    const r = 0.4 + rand() * 0.8;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#cfd8ff" opacity="${f(0.25 + rand() * 0.4)}"/>`;
  }
  return out;
}

function defs(): string {
  return `<defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050a24"/><stop offset="1" stop-color="#1b2a63"/>
    </linearGradient>
    <radialGradient id="starGlow"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="starGlowOrange"><stop offset="0" stop-color="#ffc58a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffc58a" stop-opacity="0"/></radialGradient>
  </defs>`;
}

function landscape(label = true): string {
  return `<path d="M0 ${HY} Q 60 ${HY - 12} 120 ${HY - 4} T 240 ${HY - 6} T 400 ${HY - 3} L 400 ${H} L 0 ${H} Z" fill="#0d1a17"/>
    <line x1="0" y1="${HY}" x2="${W}" y2="${HY}" stroke="#4d6b8a" stroke-width="1.5"/>
    ${label ? `<text x="8" y="${HY + 16}" class="svg-label small">HORIZONTE</text>` : ""}`;
}

function frame(content: string, extraClass = ""): string {
  return `<svg class="sky ${extraClass}" viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg">
    ${defs()}<rect width="${W}" height="${H}" fill="url(#skyGrad)"/>${backgroundStars()}${content}</svg>`;
}

type StarKind = "main" | "brightest" | "orange" | "faint" | "far";

function star(p: Point, kind: StarKind, extra = ""): string {
  const r = { main: 4.2, brightest: 5.6, orange: 4.6, faint: 2.2, far: 3.2 }[kind];
  const color = kind === "orange" ? "#ffb870" : "#ffffff";
  const glow = kind === "orange" ? "url(#starGlowOrange)" : "url(#starGlow)";
  return `<g ${extra}><circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r * 3)}" fill="${glow}" opacity="0.6"/>
    <circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" fill="${color}"/></g>`;
}

function crossStars(names = false): string {
  let s = star(CROSS.gacrux, "orange") + star(CROSS.acrux, "brightest") + star(CROSS.mimosa, "main") + star(CROSS.delta, "main");
  s += star(EXTRA_STARS.epsilon, "faint");
  if (names) {
    s += `<text x="${f(CROSS.gacrux.x - 50)}" y="${f(CROSS.gacrux.y + 4)}" class="svg-label">Gacrux</text>`;
    s += `<text x="${f(CROSS.acrux.x + 12)}" y="${f(CROSS.acrux.y + 16)}" class="svg-label">Acrux</text>`;
  }
  return s;
}

function line(a: Point, b: Point, cls: string, extra = ""): string {
  return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" class="${cls}" ${extra}/>`;
}

function axisLine(cls = "axis"): string {
  return line(CROSS.gacrux, CROSS.acrux, cls);
}

function guideLine(intense: boolean, animate = false): string {
  return line(CROSS.acrux, GUIDE_END, `guide ${intense ? "guide-intense" : ""} ${animate ? "draw" : ""}`);
}

function badge(p: Point, text: string, cls = ""): string {
  return `<g class="badge ${cls}"><circle cx="${f(p.x)}" cy="${f(p.y)}" r="10"/><text x="${f(p.x)}" y="${f(p.y + 4)}">${text}</text></g>`;
}

function optionClasses(id: string, st: SceneState, correct: string[]): string {
  const cls = ["opt"];
  if (st.selected.includes(id)) cls.push("selected");
  if (st.highlights.has(id)) cls.push("highlight");
  if (st.removed.has(id)) cls.push("removed");
  if (st.solved && correct.includes(id)) cls.push("correct");
  return cls.join(" ");
}

function actionAttrs(id: string, st: SceneState): string {
  return st.removed.has(id) || st.solved ? "" : `data-action="select-option" data-id="${id}"`;
}

/** Línea seleccionable con zona táctil amplia y una letra. */
function selectableLine(id: string, a: Point, b: Point, letter: string, labelAt: Point, st: SceneState, correct: string[], lineCls: string): string {
  return `<g class="${optionClasses(id, st, correct)}" ${actionAttrs(id, st)}>
    ${line(a, b, "hit")}${line(a, b, lineCls)}${badge(labelAt, letter)}</g>`;
}

function highlightRing(p: Point, id: string, st: SceneState, r = 13): string {
  return st.highlights.has(id) ? `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${r}" class="pulse-ring"/>` : "";
}

// ---------------- Escenas de los desafíos ----------------

function groupsScene(ch: Challenge, st: SceneState): string {
  const panelW = 124;
  const panels = [
    { id: "grupo-a", letter: "A", x: 6 },
    { id: "grupo-b", letter: "B", x: 138 },
    { id: "grupo-c", letter: "C", x: 270 }
  ];
  const groupStars: Record<string, string> = {};
  // A: círculo de estrellas.
  groupStars["grupo-a"] = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2;
    return star({ x: 68 + Math.cos(a) * 34, y: 118 + Math.sin(a) * 34 }, "main");
  }).join("");
  // B: la Cruz del Sur, trasladada al centro del panel.
  const tr = (p: Point) => ({ x: (p.x - 174) * 0.8 + 200, y: (p.y - 69) * 0.8 + 128 });
  groupStars["grupo-b"] =
    star(tr(CROSS.gacrux), "orange") + star(tr(CROSS.acrux), "brightest") + star(tr(CROSS.mimosa), "main") + star(tr(CROSS.delta), "main") + star(tr(EXTRA_STARS.epsilon), "faint");
  // C: una fila de estrellas.
  groupStars["grupo-c"] = [0, 1, 2, 3, 4].map((i) => star({ x: 290 + i * 21, y: 150 - i * 16 }, "main")).join("");

  const body = panels
    .map((p) => {
      const cls = optionClasses(p.id, st, ch.correct);
      return `<g class="${cls} panel" ${actionAttrs(p.id, st)}>
        <rect x="${p.x}" y="30" width="${panelW}" height="200" rx="12" class="panel-rect"/>
        ${groupStars[p.id]}
        <text x="${p.x + panelW / 2}" y="252" class="svg-label big" text-anchor="middle">Grupo ${p.letter}</text></g>`;
    })
    .join("");
  return frame(body);
}

const FIELD_STARS: Record<string, { p: Point; kind: StarKind; n: number }> = {
  lejana2: { p: EXTRA_STARS.lejana2, kind: "far", n: 1 },
  mimosa: { p: CROSS.mimosa, kind: "main", n: 2 },
  gacrux: { p: CROSS.gacrux, kind: "orange", n: 3 },
  epsilon: { p: EXTRA_STARS.epsilon, kind: "faint", n: 4 },
  delta: { p: CROSS.delta, kind: "main", n: 5 },
  lejana1: { p: EXTRA_STARS.lejana1, kind: "far", n: 6 },
  acrux: { p: CROSS.acrux, kind: "brightest", n: 7 }
};

function starFieldScene(ch: Challenge, st: SceneState): string {
  const body = Object.entries(FIELD_STARS)
    .map(([id, s]) => {
      const cls = optionClasses(id, st, ch.correct);
      const label = { x: s.p.x + 12, y: s.p.y - 8 };
      return `<g class="${cls} star-opt" ${actionAttrs(id, st)}>
        <circle cx="${f(s.p.x)}" cy="${f(s.p.y)}" r="15" class="hit-circle"/>
        <circle cx="${f(s.p.x)}" cy="${f(s.p.y)}" r="11" class="sel-ring"/>
        ${star(s.p, s.kind)}${badge(label, String(s.n), "small")}</g>`;
    })
    .join("");
  return frame(body + landscape());
}

function axisScene(ch: Challenge, st: SceneState): string {
  const mid = (a: Point, b: Point, t = 0.5): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  let body = crossStars();
  body += selectableLine("linea-a", CROSS.mimosa, CROSS.delta, "A", { x: CROSS.delta.x + 16, y: CROSS.delta.y - 8 }, st, ch.correct, "cand");
  body += selectableLine("linea-b", CROSS.mimosa, CROSS.acrux, "B", { x: mid(CROSS.mimosa, CROSS.acrux).x - 16, y: mid(CROSS.mimosa, CROSS.acrux).y + 10 }, st, ch.correct, "cand");
  body += selectableLine("linea-c", CROSS.gacrux, CROSS.acrux, "C", { x: CROSS.acrux.x + 14, y: CROSS.acrux.y + 14 }, st, ch.correct, "cand");
  if (st.axisReminder) {
    body += `<g class="axis-reminder" transform="translate(262 140)">
      <rect x="0" y="0" width="130" height="92" rx="10"/>
      <line x1="44" y1="14" x2="44" y2="78" class="reminder-base"/>
      <line x1="44" y1="14" x2="44" y2="78" class="reminder-long"/>
      <line x1="26" y1="36" x2="62" y2="36" class="reminder-short"/>
      <text x="72" y="30" class="svg-label tiny">EJE MAYOR</text>
      <text x="72" y="44" class="svg-label tiny">= palo</text>
      <text x="72" y="58" class="svg-label tiny">más largo</text>
    </g>`;
  }
  return frame(body + landscape());
}

const ASSIGN_POS: Record<string, { p: Point; label: Point }> = {
  "pos-a": { p: CROSS.mimosa, label: { x: CROSS.mimosa.x - 22, y: CROSS.mimosa.y + 2 } },
  "pos-b": { p: CROSS.gacrux, label: { x: CROSS.gacrux.x - 2, y: CROSS.gacrux.y - 18 } },
  "pos-c": { p: CROSS.delta, label: { x: CROSS.delta.x + 22, y: CROSS.delta.y - 4 } },
  "pos-d": { p: CROSS.acrux, label: { x: CROSS.acrux.x + 6, y: CROSS.acrux.y + 22 } }
};

function assignScene(ch: Challenge, st: SceneState): string {
  let body = axisLine("axis dim") + line(CROSS.mimosa, CROSS.delta, "axis dim");
  body += crossStars();
  for (const [id, pos] of Object.entries(ASSIGN_POS)) {
    const letter = ch.options.find((o) => o.id === id)!.label;
    const cls = optionClasses(id, st, ch.correct);
    body += `<g class="${cls} star-opt" ${actionAttrs(id, st)}>
      <circle cx="${f(pos.p.x)}" cy="${f(pos.p.y)}" r="16" class="hit-circle"/>
      ${highlightRing(pos.p, id, st)}${badge(pos.label, letter, "small")}</g>`;
  }
  // Rótulos colocados.
  for (const slot of ch.slots ?? []) {
    const posId = st.assignment[slot.id];
    if (!posId) continue;
    const pos = ASSIGN_POS[posId];
    const x = pos.p.x + (posId === "pos-a" ? -86 : 20);
    const y = pos.p.y + (posId === "pos-b" ? 2 : posId === "pos-d" ? 6 : 16);
    body += `<g class="name-tag"><rect x="${f(x)}" y="${f(y - 13)}" width="64" height="18" rx="9"/><text x="${f(x + 32)}" y="${f(y)}" text-anchor="middle">${slot.label}</text></g>`;
  }
  return frame(body + landscape());
}

function prolongationScene(ch: Challenge, st: SceneState): string {
  const axis = { x: CROSS.acrux.x - CROSS.gacrux.x, y: CROSS.acrux.y - CROSS.gacrux.y };
  const bEnd = { x: CROSS.gacrux.x - axis.x * 0.5, y: Math.max(4, CROSS.gacrux.y - axis.y * 0.5) };
  const cDir = rotate({ x: CROSS.acrux.x + axis.x, y: CROSS.acrux.y + axis.y }, CROSS.acrux, 55);
  const guideCls = `cand dashed ${st.intenseGuide ? "guide-intense" : ""}`;
  let body = axisLine() + crossStars(true);
  body += highlightRing(CROSS.acrux, "acrux", st, 14);
  body += selectableLine("prolongacion-a", CROSS.acrux, GUIDE_END, "A", { x: GUIDE_END.x + 14, y: GUIDE_END.y }, st, ch.correct, guideCls);
  body += selectableLine("prolongacion-b", CROSS.gacrux, bEnd, "B", { x: bEnd.x - 14, y: bEnd.y + 10 }, st, ch.correct, guideCls);
  body += selectableLine("prolongacion-c", CROSS.acrux, cDir, "C", { x: cDir.x - 14, y: cDir.y + 4 }, st, ch.correct, guideCls);
  return frame(body + landscape());
}

function guideEndMarker(st: SceneState): string {
  const hl = st.highlights.has("extremo-guia") ? "highlight" : "";
  return `<g class="guide-end ${hl}"><circle cx="${f(GUIDE_END.x)}" cy="${f(GUIDE_END.y)}" r="5"/>
    ${hl ? `<circle cx="${f(GUIDE_END.x)}" cy="${f(GUIDE_END.y)}" r="13" class="pulse-ring"/>` : ""}
    <text x="${f(GUIDE_END.x + 12)}" y="${f(GUIDE_END.y - 8)}" class="svg-label small">extremo de la guía</text></g>`;
}

function descentScene(ch: Challenge, st: SceneState): string {
  let body = axisLine() + crossStars(true) + guideLine(st.intenseGuide) + guideEndMarker(st);
  const diagEnd = { x: GUIDE_END.x - 80, y: HY };
  const lineCls = "cand drop";
  body += selectableLine("bajada-a", GUIDE_END, diagEnd, "A", { x: diagEnd.x - 4, y: HY - 14 }, st, ch.correct, lineCls);
  body += selectableLine("bajada-b", GUIDE_END, SOUTH_POINT, "B", { x: SOUTH_POINT.x + 14, y: HY - 14 }, st, ch.correct, lineCls);
  body += selectableLine("bajada-c", CROSS.acrux, below(CROSS.acrux), "C", { x: CROSS.acrux.x + 14, y: HY - 40 }, st, ch.correct, lineCls);
  return frame(body + landscape());
}

function southScene(ch: Challenge, st: SceneState): string {
  const dropCls = `drop fixed ${st.highlights.has("bajada") ? "highlight-line" : ""}`;
  let body = axisLine() + crossStars(true) + guideLine(st.intenseGuide) + guideEndMarker({ ...st, highlights: new Set() });
  body += line(GUIDE_END, SOUTH_POINT, dropCls);
  const points: Record<string, Point> = {
    "punto-a": below(CROSS.gacrux),
    "punto-b": below(CROSS.acrux),
    "punto-c": SOUTH_POINT,
    "punto-d": { x: 340, y: HY }
  };
  body += landscape(false);
  for (const [id, p] of Object.entries(points)) {
    const letter = ch.options.find((o) => o.id === id)!.label.replace("Punto ", "");
    const cls = optionClasses(id, st, ch.correct);
    body += `<g class="${cls} point-opt" ${actionAttrs(id, st)}>
      <circle cx="${f(p.x)}" cy="${f(p.y)}" r="16" class="hit-circle"/>
      <circle cx="${f(p.x)}" cy="${f(p.y)}" r="6" class="horizon-point"/>
      ${badge({ x: p.x, y: p.y + 22 }, letter, "small")}</g>`;
  }
  if (st.solved) body += `<text x="${f(SOUTH_POINT.x)}" y="${f(HY - 12)}" class="svg-label south-label" text-anchor="middle">SUR</text>`;
  return frame(body);
}

export function challengeScene(ch: Challenge, st: SceneState): string {
  switch (ch.scene) {
    case "three-groups":
      return groupsScene(ch, st);
    case "star-field":
      return starFieldScene(ch, st);
    case "axis-lines":
      return axisScene(ch, st);
    case "assign-names":
      return assignScene(ch, st);
    case "prolongations":
      return prolongationScene(ch, st);
    case "descents":
      return descentScene(ch, st);
    case "south-points":
      return southScene(ch, st);
  }
}

// ---------------- Procedimiento completo (demostración y síntesis) ----------------

/** step: 1 ENCONTRAR, 2 SEGUIR, 3 BAJAR. Muestra todo hasta el paso indicado. */
export function procedureScene(step: 1 | 2 | 3, intenseGuide: boolean, animate: boolean): string {
  let body = "";
  body += `<g class="${step === 1 && animate ? "fade-in" : ""}">${line(CROSS.mimosa, CROSS.delta, "axis dim")}${axisLine("axis strong")}${crossStars(true)}
    <text x="${f((CROSS.gacrux.x + CROSS.acrux.x) / 2 - 12)}" y="${f((CROSS.gacrux.y + CROSS.acrux.y) / 2 + 26)}" class="svg-label small" text-anchor="end">eje mayor</text></g>`;
  if (step >= 2) {
    body += guideLine(intenseGuide, animate && step === 2);
    body += `<circle cx="${f(GUIDE_END.x)}" cy="${f(GUIDE_END.y)}" r="4" class="guide-dot ${animate && step === 2 ? "late-fade" : ""}"/>`;
  }
  if (step >= 3) {
    body += line(GUIDE_END, SOUTH_POINT, `drop fixed ${animate ? "draw" : ""}`);
    body += `<g class="${animate ? "late-fade" : ""}"><circle cx="${f(SOUTH_POINT.x)}" cy="${f(SOUTH_POINT.y)}" r="7" class="south-dot"/>
      <text x="${f(SOUTH_POINT.x)}" y="${f(HY - 12)}" class="svg-label south-label" text-anchor="middle">SUR</text></g>`;
  }
  return frame(body + landscape());
}

// ---------------- Imágenes de las preguntas de rescate ----------------

export function rescueVisual(v: RescueVisual): string {
  switch (v) {
    case "rotated-cross": {
      const c = { x: 170, y: 90 };
      const r = (p: Point) => rotate(p, c, 58);
      const body = star(r(CROSS.gacrux), "orange") + star(r(CROSS.acrux), "brightest") + star(r(CROSS.mimosa), "main") + star(r(CROSS.delta), "main") + star(r(EXTRA_STARS.epsilon), "faint");
      return frame(body + landscape(false), "small-sky");
    }
    case "scheme-correct": {
      const body = axisLine() + crossStars() + guideLine(false) + line(GUIDE_END, SOUTH_POINT, "drop fixed") + `<circle cx="${f(SOUTH_POINT.x)}" cy="${f(HY)}" r="6" class="south-dot"/>`;
      return frame(body + landscape(false), "small-sky");
    }
    case "scheme-from-gacrux": {
      const axis = { x: CROSS.acrux.x - CROSS.gacrux.x, y: CROSS.acrux.y - CROSS.gacrux.y };
      const end = { x: CROSS.gacrux.x - axis.x * 0.45, y: CROSS.gacrux.y - axis.y * 0.45 };
      const body = axisLine() + crossStars() + line(CROSS.gacrux, end, "guide") + line(end, below(end), "drop fixed") + `<circle cx="${f(end.x)}" cy="${f(HY)}" r="6" class="south-dot"/>`;
      return frame(body + landscape(false), "small-sky");
    }
    case "scheme-below-acrux": {
      const body = axisLine() + crossStars() + line(CROSS.acrux, below(CROSS.acrux), "drop fixed") + `<circle cx="${f(CROSS.acrux.x)}" cy="${f(HY)}" r="6" class="south-dot"/>`;
      return frame(body + landscape(false), "small-sky");
    }
  }
}
