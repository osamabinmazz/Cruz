import * as THREE from "three";
import type { Point } from "../src/core/geometry";

/**
 * Del campo de la 2.0 (960 × 690) al mundo 3D: 1 unidad del mundo = 10 del campo.
 * Orientación: Norte = −z (arriba del mapa), Este = +x (derecha), Sur = +z, Oeste = −x.
 */
export const FIELD_SCALE = 0.1;
export const WORLD_W = 960 * FIELD_SCALE;
export const WORLD_D = 690 * FIELD_SCALE;

export function toWorld(p: Point, y = 0): THREE.Vector3 {
  return new THREE.Vector3(p.x * FIELD_SCALE, y, p.y * FIELD_SCALE);
}

export function toField(v: THREE.Vector3): Point {
  return { x: v.x / FIELD_SCALE, y: v.z / FIELD_SCALE };
}

export type Cardinal = "N" | "NE" | "E" | "SE" | "S" | "SO" | "O" | "NO";

/** Rumbo (grados, 0 = Norte, 90 = Este) de una dirección en el plano del mundo. */
export function headingDegrees(dx: number, dz: number): number {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

const NAMES: Cardinal[] = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

export function cardinalOf(heading: number): Cardinal {
  return NAMES[Math.round((((heading % 360) + 360) % 360) / 45) % 8];
}
