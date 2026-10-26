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
  for (const [material, geos] of byMaterial) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (merged) out.add(new THREE.Mesh(merged, material));
  }
  return out;
}
