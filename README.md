# Bot de Discord para tu servidor de exaroton

Avisa en un canal de Discord:
- 🟢 Cuando el servidor se enciende
- 🔴 Cuando se apaga (o crashea)
- 🟢 Cuando un jugador entra (con la carita de su skin)
- 🔴 Cuando un jugador sale (con la carita de su skin)
- ⚠️ Cuando un jugador lleva 10+ minutos (configurable) solo en el servidor, mencionando a un rol de Discord

Usa las librerías **oficiales** de exaroton y discord.js, conectadas por websocket, así que los avisos son en tiempo real (no hay que estar revisando cada tantos segundos).

## 1. Requisitos

- [Node.js](https://nodejs.org/) versión 22 o más nueva.
- Un servidor de Discord donde tengas permisos para agregar bots.
- Una cuenta de [exaroton](https://exaroton.com/) con al menos un servidor.

## 2. Crear el bot de Discord

1. Ve a https://discord.com/developers/applications y da clic en **New Application**. Ponle un nombre (ej. "Exaroton Notifier").
2. En el menú izquierdo, ve a **Bot**. Da clic en **Reset Token** y copia el token — lo vas a necesitar en el paso 5. **No lo compartas con nadie.**
3. No necesitas activar ningún "Privileged Gateway Intent" — este bot solo manda mensajes, no lee nada.
4. Ve a **OAuth2 > URL Generator**. En "Scopes" marca `bot`. En "Bot Permissions" marca `Send Messages` y `Embed Links`.
5. Copia la URL que se genera abajo, ábrela en el navegador, y agrega el bot a tu servidor de Discord.

## 3. Obtener el ID del canal

1. En Discord, ve a **Configuración de usuario > Avanzado** y activa **Modo desarrollador**.
2. Clic derecho sobre el canal donde quieres los avisos (el de Minecraft) > **Copiar ID del canal**.

## 3.5. (Opcional) Configurar el aviso de "jugando solo"

Si quieres que el bot mencione un rol cuando alguien lleva rato jugando solo:

1. Con el Modo desarrollador ya activado, ve a **Configuración del servidor > Roles**, clic derecho sobre el rol (ej. `@Minecraft`) > **Copiar ID del rol**.
2. **Importante**: entra a ese mismo rol en Configuración del servidor > Roles, y asegúrate de que la opción **"Permitir que cualquiera mencione este rol"** esté activada. Si está desactivada, el bot puede escribir el `@Minecraft` en el mensaje pero Discord no le va a mandar notificación a nadie — el mensaje se ve igual pero no "suena".
3. Si prefieres no tocar esa opción del rol, la alternativa es darle al bot el permiso **"Mention @everyone, @here, and All Roles"** al invitarlo (paso 2.4) — con eso puede mencionar el rol sin importar su configuración.

Si no configuras esto, el bot funciona exactamente igual, solo que sin el aviso de jugador solo.

## 4. Obtener tus datos de exaroton

1. Ve a https://exaroton.com/account/ y genera un API Token.
2. Para encontrar el ID de tu servidor, lo más fácil es usar el script incluido — sigue el paso 5 primero, pon tu `EXAROTON_TOKEN` en el `.env`, y corre:
   ```
   npm run list-servers
   ```
   Esto te imprime todos tus servidores con su ID correspondiente.

## 5. Configurar el proyecto

1. Copia `.env.example` a un archivo nuevo llamado `.env`.
2. Rellena las 4 variables obligatorias:
   ```
   DISCORD_TOKEN=el_token_de_tu_bot
   DISCORD_CHANNEL_ID=el_id_del_canal
   EXAROTON_TOKEN=tu_api_token_de_exaroton
   EXAROTON_SERVER_ID=el_id_de_tu_servidor
   ```
   Y si quieres el aviso de jugador solo, también:
   ```
   DISCORD_MINECRAFT_ROLE_ID=el_id_del_rol
   SOLO_ALERT_MINUTES=10
   ```
3. Instala las dependencias:
   ```
   npm install
   ```

## 6. Correrlo

```
npm start
```

Si todo está bien configurado, en la consola vas a ver algo como:

```
Conectado a Discord como TuBot#1234
Escuchando el servidor "MiServidor" (estado actual: 0)
```

Deja la ventana abierta — mientras el proceso esté corriendo, el bot está escuchando.

## 7. Dejarlo corriendo 24/7

Para que avise incluso cuando tu compu esté apagada, necesitas correr esto en algo que esté siempre prendido: un servidorcito VPS barato, un Raspberry Pi en casa, o un servicio gratuito/económico de hosting para Node.js (Railway, Render, etc.). Si solo lo corres en tu laptop, va a funcionar, pero solo mientras la laptop esté prendida y con internet.

## Notas y límites

- **Lista de jugadores**: la API de exaroton marca que la lista de jugadores conectados "no siempre está disponible". En la enorme mayoría de los casos sí llega bien, pero si alguna vez ves que un aviso de entrada/salida no llegó, es de este lado.