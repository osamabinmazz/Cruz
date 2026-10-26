import { isStudent3, studentKey3, type Student3 } from "../src/core/students3d";

/**
 * Los estudiantes de la 3.0 se guardan en este aparato (localStorage), sin cuentas ni internet.
 * Todo va envuelto en try/catch: si el navegador no deja guardar, el juego funciona igual pero no recuerda nada.
 */
const KEY = "cruz3-estudiantes";

function readAll(): Record<string, Student3> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Record<string, Student3> = {};
    for (const [k, v] of Object.entries(parsed)) if (isStudent3(v)) clean[k] = v;
    return clean;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Student3>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** Estudiantes guardados, el último en jugar primero. */
export function listStudents3(): Student3[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function findStudent3(name: string): Student3 | null {
  return readAll()[studentKey3(name)] ?? null;
}

export function saveStudent3(s: Student3): boolean {
  const all = readAll();
  all[studentKey3(s.name)] = s;
  return writeAll(all);
}

export function deleteStudent3(name: string): void {
  const all = readAll();
  delete all[studentKey3(name)];
  writeAll(all);
}

/** Un estudiante como texto, para pasarlo a otro aparato. */
export function exportStudent3(name: string): string | null {
  const s = findStudent3(name);
  return s ? JSON.stringify(s) : null;
}

/** Importa un estudiante exportado; devuelve su nombre o lanza un error con un mensaje claro. */
export function importStudent3(text: string): string {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ese código no es válido. Cópialo completo.");
  }
  if (!isStudent3(data)) throw new Error("Ese código no es de un estudiante de la 3.0.");
  saveStudent3(data);
  return data.name;
}
