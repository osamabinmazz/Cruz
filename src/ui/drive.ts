/**
 * Subida opcional del reporte CSV a Google Drive. Usa Google Identity Services
 * (el docente pone su propio Client ID de OAuth, ver docs/DRIVE.md). Solo pide
 * el permiso "drive.file": el juego únicamente puede ver los archivos que él
 * mismo crea. Nada se envía hasta que el docente toca el botón.
 */
const GIS = "https://accounts.google.com/gsi/client";

interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken(): void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: unknown) => void }): TokenClient;
        };
      };
    };
  }
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar el servicio de Google. ¿Hay internet?"));
    document.head.appendChild(s);
  });
}

function token(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? "Google no dio el permiso."))),
      error_callback: () => reject(new Error("Se canceló el permiso de Google."))
    });
    client.requestAccessToken();
  });
}

/** Sube el CSV a la raíz del Drive del docente y devuelve el enlace del archivo. */
export async function uploadCsvToDrive(clientId: string, filename: string, csv: string): Promise<string> {
  await loadGis();
  const access = await token(clientId);
  const boundary = "cruz" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: filename, mimeType: "text/csv" });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: text/csv; charset=UTF-8\r\n\r\n${csv}\r\n--${boundary}--`;
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  if (!res.ok) throw new Error(`Drive respondió ${res.status}. Revisa el Client ID y que tu correo esté como usuario de prueba.`);
  const data = (await res.json()) as { webViewLink?: string };
  return data.webViewLink ?? "";
}
