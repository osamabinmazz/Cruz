# Subir el reporte a Google Drive (opcional)

El panel del docente siempre puede **descargar el reporte en CSV** (se abre en Excel, Google Sheets o LibreOffice).
Si además quieres subirlo a tu Google Drive con un botón, necesitas un *Client ID* propio. Se hace una sola vez:

1. Entra a <https://console.cloud.google.com/> y crea un proyecto (por ejemplo "Cruz del Sur").
2. **APIs y servicios → Biblioteca**: busca **Google Drive API** y actívala.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**: elige *Externo*, pon un nombre, tu correo, y en
   **Usuarios de prueba** agrega tu propio correo de Google.
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
   En **Orígenes de JavaScript autorizados** agrega la dirección desde la que juegas, por ejemplo
   `https://osamabinmazz.github.io`. (Con el archivo sin conexión abierto desde el disco, Google no permite el inicio
   de sesión: en ese caso usa la descarga del CSV.)
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).
6. En el juego: **DOCENTE → Ajustes → Client ID de Google** y pégalo.
7. En **Estudiantes** toca **Subir a Drive**. Google te pedirá permiso; el juego solo recibe el permiso `drive.file`,
   es decir, solo puede ver los archivos que él mismo crea.

Notas:
- No se envía nada a ningún servidor hasta que tocas **Subir a Drive**.
- Los datos de los estudiantes (nombre y progreso) quedan en tu Drive; cuida quién tiene acceso a ese archivo.
- Esta función necesita internet y no se pudo probar en el entorno de desarrollo: si algo falla, el mensaje de error
  aparece en pantalla y el CSV descargable sigue funcionando.
