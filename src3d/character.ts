import * as THREE from "three";
import { block, faceTexture, headBlock } from "./blocks";

/**
 * Personajes de bloques estilo Roblox: el estudiante de túnica blanca y los zombis.
 * Todo se mide en unidades del mundo (un personaje mide unas 3 unidades).
 */

export const SKINS = ["#f6d1a8", "#e0a97a", "#b9774a", "#7b4a2d", "#4a2c1a"] as const;
export const HAIR_COLORS = ["#2b1b12", "#5a3a1f", "#c9a24a", "#d6453d", "#1b1b2f"] as const;
export type HairStyle = "corto" | "largo" | "rizos";
export type Accessory = "diadema" | "capa" | "estrella";

export interface LookOptions {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  accessory: Accessory;
}

export const DEFAULT_LOOK: LookOptions = { skin: 1, hair: "corto", hairColor: 0, accessory: "diadema" };

const LEG_H = 1.1;
const TORSO_H = 1.1;
const TORSO_W = 1.15;
const TORSO_D = 0.58;
const HEAD = 0.9;
const ARM_W = 0.5;
const ARM_H = 1.1;
const TOTAL_H = LEG_H + TORSO_H + HEAD;

export interface Rig {
  group: THREE.Group;
  /** Pivote del cuerpo entero (para saltitos y la inclinación al caminar). */
  body: THREE.Group;
  head: THREE.Object3D;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  height: number;
}

function limb(w: number, h: number, d: number, color: string, topY: number, x: number, z = 0): THREE.Group {
  // El pivote queda arriba (hombro o cadera) y el bloque cuelga hacia abajo.
  const g = new THREE.Group();
  g.position.set(x, topY, z);
  g.add(block(w, h, d, color, 0, -h / 2, 0));
  return g;
}

/** Esqueleto básico de un humanoide de bloques. */
export function buildRig(o: { skin: string; shirt: string; sleeves?: string; pants: string; shoes?: string; face: "kid" | "zombie" }): Rig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const legTop = LEG_H;
  const legL = limb(0.5, LEG_H, 0.5, o.pants, legTop, -0.3);
  const legR = limb(0.5, LEG_H, 0.5, o.pants, legTop, 0.3);
  for (const leg of [legL, legR]) leg.add(block(0.56, 0.22, 0.62, o.shoes ?? "#2b2323", 0, -LEG_H + 0.11, 0.04));
  body.add(legL, legR);
  body.add(block(TORSO_W, TORSO_H, TORSO_D, o.shirt, 0, LEG_H + TORSO_H / 2, 0));
  const shoulderY = LEG_H + TORSO_H - 0.05;
  const armL = limb(ARM_W, ARM_H, ARM_W, o.sleeves ?? o.shirt, shoulderY, -(TORSO_W / 2 + ARM_W / 2));
  const armR = limb(ARM_W, ARM_H, ARM_W, o.sleeves ?? o.shirt, shoulderY, TORSO_W / 2 + ARM_W / 2);
  for (const arm of [armL, armR]) arm.add(block(ARM_W + 0.02, 0.28, ARM_W + 0.02, o.skin, 0, -ARM_H + 0.14, 0));
  body.add(armL, armR);
  const head = headBlock(HEAD, o.skin, faceTexture(o.face, o.skin));
  head.position.set(0, LEG_H + TORSO_H + HEAD / 2, 0);
  body.add(head);
  return { group, body, head, armL, armR, legL, legR, height: TOTAL_H };
}

/** Estudiante de túnica blanca, con piel, pelo y un accesorio estelar a elección. */
export function buildStudent(look: LookOptions = DEFAULT_LOOK): Rig {
  const skin = SKINS[look.skin % SKINS.length];
  const rig = buildRig({ skin, shirt: "#fbfbff", sleeves: "#f1f1fa", pants: skin, shoes: "#c9a24a", face: "kid" });
  const { body, head } = rig;
  // Túnica: falda que cubre las piernas hasta las rodillas, cinturón dorado y cuello.
  body.add(block(1.3, 0.75, 0.74, "#fbfbff", 0, LEG_H - 0.2, 0));
  body.add(block(1.3, 0.12, 0.74, "#e9e9f5", 0, LEG_H - 0.55, 0));
  body.add(block(TORSO_W + 0.04, 0.16, TORSO_D + 0.04, "#d8a929", 0, LEG_H + 0.18, 0));
  body.add(block(0.5, 0.1, TORSO_D + 0.06, "#e9e9f5", 0, LEG_H + TORSO_H - 0.02, 0));
  // Estrella bordada en el pecho.
  body.add(block(0.2, 0.2, 0.04, "#d8a929", 0, LEG_H + 0.7, TORSO_D / 2 + 0.03));
  // Pelo.
  const hairColor = HAIR_COLORS[look.hairColor % HAIR_COLORS.length];
  const topY = LEG_H + TORSO_H + HEAD;
  body.add(block(HEAD + 0.1, 0.28, HEAD + 0.1, hairColor, 0, topY - 0.06, -0.02));
  if (look.hair === "largo") {
    body.add(block(HEAD + 0.1, 0.9, 0.22, hairColor, 0, topY - 0.55, -HEAD / 2 - 0.02));
    body.add(block(0.18, 0.6, 0.5, hairColor, -HEAD / 2 - 0.02, topY - 0.45, -0.15));
    body.add(block(0.18, 0.6, 0.5, hairColor, HEAD / 2 + 0.02, topY - 0.45, -0.15));
  } else if (look.hair === "rizos") {
    for (const [x, z] of [[-0.32, -0.1], [0.32, -0.1], [0, -0.38], [0, 0.22]] as const) body.add(block(0.38, 0.38, 0.38, hairColor, x, topY + 0.1, z));
  } else {
    body.add(block(HEAD + 0.1, 0.5, 0.2, hairColor, 0, topY - 0.25, -HEAD / 2 - 0.02));
  }
  // Accesorio estelar.
  if (look.accessory === "diadema") {
    body.add(block(HEAD + 0.12, 0.1, 0.1, "#ffd54a", 0, topY - 0.28, HEAD / 2 + 0.02));
    body.add(block(0.22, 0.22, 0.1, "#ffd54a", 0, topY - 0.2, HEAD / 2 + 0.04, { emissive: "#7a5a00" }));
  } else if (look.accessory === "capa") {
    const cape = block(1.05, 1.6, 0.1, "#2f6fe4", 0, LEG_H + 0.3, -TORSO_D / 2 - 0.12);
    body.add(cape);
    body.add(block(0.22, 0.22, 0.06, "#ffd54a", 0, LEG_H + 0.55, -TORSO_D / 2 - 0.18, { emissive: "#7a5a00" }));
  } else {
    const star = new THREE.Group();
    star.add(block(0.3, 0.3, 0.1, "#ffd54a", 0, 0, 0, { emissive: "#9a7400" }));
    const star2 = block(0.3, 0.3, 0.1, "#ffd54a", 0, 0, 0, { emissive: "#9a7400" });
    star2.rotation.z = Math.PI / 4;
    star.add(star2);
    star.position.set(0, topY + 0.55, 0);
    star.userData.spin = true;
    head.parent!.add(star);
    rig.group.userData.star = star;
  }
  head.userData.keep = true;
  return rig;
}

/** Anima el caminar: `phase` avanza con la distancia recorrida y `amount` (0–1) es qué tan rápido va. */
export function animateWalk(rig: Rig, phase: number, amount: number): void {
  const swing = Math.sin(phase) * 0.85 * amount;
  rig.legL.rotation.x = swing;
  rig.legR.rotation.x = -swing;
  rig.armL.rotation.x = -swing * 0.9;
  rig.armR.rotation.x = swing * 0.9;
  rig.body.position.y = Math.abs(Math.cos(phase)) * 0.07 * amount;
}

/** Brazo derecho levantado para disparar (k de 0 a 1). */
export function animateAim(rig: Rig, k: number): void {
  rig.armR.rotation.x = -Math.PI / 2 * k + rig.armR.rotation.x * (1 - k);
}
