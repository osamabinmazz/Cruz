import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Utilidades para construir todo con bloques (estilo Roblox): colores planos y caras sencillas. */

const geoCache = new Map<string, THREE.BoxGeometry>();
const matCache = new Map<string, THREE.MeshLambertMaterial>();

export function boxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w}|${h}|${d}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

export function mat(color: number | string, opts: { emissive?: number | string; opacity?: number } = {}): THREE.MeshLambertMaterial {
  const key = `${color}|${opts.emissive ?? ""}|${opts.opacity ?? 1}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color),
      emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1
    });
    matCache.set(key, m);
  }
  return m;
}

/** Un bloque con el centro en (x, y, z). */
export function block(w: number, h: number, d: number, color: number | string, x = 0, y = 0, z = 0, opts: { emissive?: number | string; opacity?: number } = {}): THREE.Mesh {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  return m;
}

/** Carita de bloque (ojos y boca) en un lienzo, para la cabeza. */
export function faceTexture(kind: "kid" | "zombie", skin: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = skin;
  g.fillRect(0, 0, 64, 64);
  if (kind === "kid") {
    g.fillStyle = "#1b1b2f";
    g.fillRect(16, 24, 8, 10);
    g.fillRect(40, 24, 8, 10);
    g.fillStyle = "#fff";
    g.fillRect(19, 26, 3, 3);
    g.fillRect(43, 26, 3, 3);
    g.fillStyle = "#b5483d";
    g.fillRect(24, 44, 16, 4);
    g.fillRect(22, 42, 3, 3);
    g.fillRect(39, 42, 3, 3);
    g.fillStyle = "rgba(255,120,120,0.35)";
    g.fillRect(10, 36, 8, 5);
    g.fillRect(46, 36, 8, 5);
  } else {
    // Ojos desiguales y boca abierta con dientes.
    g.fillStyle = "#fffdf0";
    g.fillRect(12, 20, 16, 16);
    g.fillRect(38, 22, 12, 12);
    g.fillStyle = "#1b1b2f";
    g.fillRect(19, 26, 6, 6);
    g.fillRect(43, 26, 5, 5);
    g.fillStyle = "#4c5a43";
    g.fillRect(10, 14, 20, 4);
    g.fillRect(38, 17, 14, 4);
    g.fillStyle = "#3b2530";
    g.fillRect(18, 42, 28, 12);
    g.fillStyle = "#fffdf0";
    g.fillRect(22, 42, 5, 5);
    g.fillRect(34, 42, 5, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cabeza de bloque con cara solo en el frente (+z). */
export function headBlock(size: number, skin: string, face: THREE.Texture): THREE.Mesh {
  const plain = mat(skin);
  const faceMat = new THREE.MeshLambertMaterial({ map: face });
  // Orden de caras de BoxGeometry: +x, −x, +y, −y, +z, −z.
  return new THREE.Mesh(boxGeo(size, size, size), [plain, plain, plain, plain, faceMat, plain]);
}

/** Cartel con texto que mira siempre a la cámara (nombres). */
export function textSprite(text: string, opts: { color?: string; bg?: string; size?: number } = {}): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.font = "bold 34px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (opts.bg) {
    g.fillStyle = opts.bg;
    g.beginPath();
    g.roundRect(8, 8, 240, 48, 14);
    g.fill();
  }
  g.lineWidth = 6;
  g.strokeStyle = "rgba(0,0,0,0.6)";
  g.strokeText(text, 128, 34);
  g.fillStyle = opts.color ?? "#ffffff";
  g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  const k = opts.size ?? 2.6;
  s.scale.set(k, k / 4, 1);
  return s;
}

let vertexMat: THREE.MeshLambertMaterial | null = null;
/** Material único con el color guardado en cada vértice: muchas piezas de distinto color se dibujan de una vez. */
export function vertexColorMaterial(): THREE.MeshLambertMaterial {
  if (!vertexMat) vertexMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  return vertexMat;
}

/** ¿Esta pieza se puede fundir con sus hermanas? (color plano, sin textura, sin brillo propio ni transparencia). */
function bakeable(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  if (!m.isMesh || m.children.length > 0 || Array.isArray(m.material) || m.userData.keep) return false;
  const mat = m.material as THREE.MeshLambertMaterial;
  return mat.type === "MeshLambertMaterial" && !mat.map && !mat.transparent && !mat.vertexColors && mat.emissive.getHex() === 0;
}

/** Geometría de una pieza en el espacio de su padre, con su color copiado a cada vértice. */
function coloredGeometry(m: THREE.Mesh, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
  g.applyMatrix4(matrix);
  const c = (m.material as THREE.MeshLambertMaterial).color;
  const n = g.getAttribute("position").count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "color") g.deleteAttribute(name);
  return g;
}

/**
 * Junta las piezas de color plano que cuelgan de un mismo grupo en una sola malla con colores por vértice.
 * Se respeta la jerarquía (cada brazo o pierna sigue moviéndose por separado): solo se juntan hermanas.
 * Así un personaje pasa de unas 15 piezas a 5 o 6, y se dibuja mucho más rápido en tablets y celulares.
 */
export function bakeColors(root: THREE.Object3D): void {
  const nodes: THREE.Object3D[] = [];
  root.traverse((o) => nodes.push(o));
  for (const node of nodes) {
    const parts = node.children.filter(bakeable);
    if (parts.length < 2) continue;
    const geos = parts.map((m) => {
      m.updateMatrix();
      return coloredGeometry(m, m.matrix);
    });
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, vertexColorMaterial());
    mesh.castShadow = parts.some((p) => p.castShadow);
    mesh.receiveShadow = parts.some((p) => p.receiveShadow);
    for (const p of parts) node.remove(p);
    node.add(mesh);
  }
}

/** Hace que un objeto proyecte sombras (y, si se pide, también las reciba). Ignora carteles y cosas transparentes. */
export function shadowify(root: THREE.Object3D, receive = false): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    if ((m.material as THREE.Material).transparent) return;
    m.castShadow = true;
    if (receive) m.receiveShadow = true;
  });
}

/** Junta en pocas mallas todo lo que no se mueve (suelo, árboles, camino…): una malla por material en vez de miles. */
export function mergeStatic(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const list = byMaterial.get(o.material) ?? [];
    list.push(g);
    byMaterial.set(o.material, list);
  });
  const out = new THREE.Group();
  // Todas las piezas de color plano van a una sola malla con colores por vértice; el resto, por material.
  const plain: THREE.BufferGeometry[] = [];
  for (const [material, geos] of [...byMaterial]) {
    const mat = material as THREE.MeshLambertMaterial;
    if (mat.type !== "MeshLambertMaterial" || mat.map || mat.transparent || mat.emissive.getHex() !== 0) continue;
    for (const g of geos) {
      const ng = g.index ? g.toNonIndexed() : g;
      const n = ng.getAttribute("position").count;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) colors.set([mat.color.r, mat.color.g, mat.color.b], i * 3);
      ng.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      for (const name of Object.keys(ng.attributes)) if (name !== "position" && name !== "normal" && name !== "color") ng.deleteAttribute(name);
      plain.push(ng);
      if (ng !== g) g.dispose();
    }
    byMaterial.delete(material);
  }
  if (plain.length) {
    const merged = mergeGeometries(plain, false);
    for (const g of plain) g.dispose();
    if (merged) out.add(new THREE.Mesh(merged, vertexColorMaterial()));
  }
  for (const [material, geos] of byMaterial) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (merged) out.add(new THREE.Mesh(merged, material));
  }
  return out;
}
