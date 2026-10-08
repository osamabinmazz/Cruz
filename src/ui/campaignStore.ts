import { Campaign, type CampaignSave } from "../core/campaign/Campaign";

/**
 * Guarda las campañas de los estudiantes en este aparato (localStorage), sin
 * cuentas ni internet. Todo está envuelto en try/catch: si el navegador no
 * deja guardar, el juego funciona igual pero sin recordar nada.
 */

const KEY = "cruz2-estudiantes";

function readAll(): Record<string, CampaignSave> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CampaignSave>;
    const clean: Record<string, CampaignSave> = {};
    for (const [key, save] of Object.entries(parsed)) {
      try {
        Campaign.fromSave(save);
        clean[key] = save;
      } catch {
        /* se descarta una campaña dañada sin perder las demás */
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, CampaignSave>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** Clave de un estudiante: el nombre sin mayúsculas ni tildes, para no repetirlo por un detalle. */
export function studentKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Estudiantes guardados, el último en jugar primero. */
export function listStudents(): CampaignSave[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function findStudent(name: string): CampaignSave | null {
  return readAll()[studentKey(name)] ?? null;
}

export function saveStudent(save: CampaignSave): boolean {
  const all = readAll();
  all[studentKey(save.name)] = save;
  return writeAll(all);
}

export function deleteStudent(name: string): void {
  const all = readAll();
  delete all[studentKey(name)];
  writeAll(all);
}

/** Todo lo guardado, para llevar la campaña a otro equipo. */
export function exportStudent(name: string): string | null {
  const save = findStudent(name);
  return save ? JSON.stringify({ app: "cruz-del-sur", version: 2, student: save }) : null;
}

/** Recupera una campaña llevada desde otro equipo. Devuelve el nombre o lanza un error claro. */
export function importStudent(text: string): string {
  let parsed: { app?: string; student?: CampaignSave };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es una campaña de Cruz del Sur.");
  }
  if (parsed.app !== "cruz-del-sur" || !parsed.student) throw new Error("El archivo no es una campaña de Cruz del Sur.");
  Campaign.fromSave(parsed.student);
  saveStudent(parsed.student);
  return parsed.student.name;
}
