import type { Teams } from "../core/teacher";

/**
 * Datos del docente en este aparato: PIN (con código de recuperación),
 * equipos de la clase y el Client ID de Google para subir a Drive. Todo vive
 * en localStorage; no hay cuentas ni servidor. El PIN solo evita que un
 * estudiante curioso entre al panel: no es una protección de seguridad fuerte.
 */
const KEY = "cruz2-docente";

interface TeacherData {
  salt: string;
  pin: string;
  recovery: string;
  teams: Teams;
  driveClientId: string;
}

/** Hash de 53 bits (cyrb53): suficiente para no guardar el PIN a la vista. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function read(): TeacherData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as TeacherData;
    return d && typeof d.pin === "string" ? { ...d, teams: d.teams ?? {}, driveClientId: d.driveClientId ?? "" } : null;
  } catch {
    return null;
  }
}

function write(d: TeacherData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const saltOf = () => randomCode();

export const hasPin = (): boolean => read() !== null;

export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

/** Crea el PIN y devuelve el código de recuperación (se muestra una sola vez). */
export function createPin(pin: string): string | null {
  if (!isValidPin(pin)) return null;
  const old = read();
  const salt = saltOf();
  const code = randomCode();
  const ok = write({ salt, pin: hash(salt + pin), recovery: hash(salt + code), teams: old?.teams ?? {}, driveClientId: old?.driveClientId ?? "" });
  return ok ? code : null;
}

export function checkPin(pin: string): boolean {
  const d = read();
  return !!d && d.pin === hash(d.salt + pin);
}

export function checkRecovery(code: string): boolean {
  const d = read();
  return !!d && d.recovery === hash(d.salt + code.trim().toUpperCase().replace(/\s+/g, ""));
}

export function getTeams(): Teams {
  return read()?.teams ?? {};
}

export function setTeams(teams: Teams): void {
  const d = read();
  if (d) write({ ...d, teams });
}

export function getDriveClientId(): string {
  return read()?.driveClientId ?? "";
}

export function setDriveClientId(id: string): void {
  const d = read();
  if (d) write({ ...d, driveClientId: id.trim() });
}
