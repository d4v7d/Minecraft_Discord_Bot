# Discord Bot for Your exaroton Server

Posts notifications in a Discord channel:
- 🟢 When the server starts
- 🔴 When it stops (or crashes)
- 🟢 When a player joins (with their skin's face)
- 🔴 When a player leaves (with their skin's face)
- ⚠️ When a player has been alone on the server for 10+ minutes (configurable), mentioning a Discord role

It uses the **official** exaroton and discord.js libraries, connected via websocket, so notifications are real-time (no need to poll every few seconds).

## 1. Requirements

- [Node.js](https://nodejs.org/) version 22 or newer.
- A Discord server where you have permission to add bots.
- An [exaroton](https://exaroton.com/) account with at least one server.

## 2. Create the Discord bot

1. Go to https://discord.com/developers/applications and click **New Application**. Give it a name (e.g. "Exaroton Notifier").
2. In the left menu, go to **Bot**. Click **Reset Token** and copy the token — you'll need it in step 5. **Don't share it with anyone.**
3. You don't need to enable any "Privileged Gateway Intent" — this bot only sends messages, it doesn't read anything.
4. Go to **OAuth2 > URL Generator**. Under "Scopes", check `bot`. Under "Bot Permissions", check `Send Messages` and `Embed Links`.
5. Copy the URL generated at the bottom, open it in your browser, and add the bot to your Discord server.

## 3. Get the channel ID

1. In Discord, go to **User Settings > Advanced** and turn on **Developer Mode**.
2. Right-click the channel where you want the notifications (your Minecraft one) > **Copy Channel ID**.

## 3.5. (Optional) Set up the "playing alone" alert

If you want the bot to mention a role when someone has been playing alone for a while:

1. With Developer Mode already on, go to **Server Settings > Roles**, right-click the role (e.g. `@Minecraft`) > **Copy Role ID**.
2. **Important**: open that same role in Server Settings > Roles and make sure the **"Allow anyone to @mention this role"** option is turned on. If it's off, the bot can write `@Minecraft` in the message, but Discord won't notify anyone — the message looks the same but doesn't "ping".
3. If you'd rather not change that role setting, the alternative is to give the bot the **"Mention @everyone, @here, and All Roles"** permission when inviting it (step 2.4) — with that, it can mention the role regardless of its settings.

If you don't set this up, the bot works exactly the same, just without the playing-alone alert.

## 4. Get your exaroton details

1. Go to https://exaroton.com/account/ and generate an API Token.
2. To find your server ID, the easiest way is to use the included script — follow step 5 first, put your `EXAROTON_TOKEN` in the `.env`, and run:
   ```
   npm run list-servers
   ```
   This prints all your servers with their corresponding IDs.

## 5. Configure the project

1. Copy `.env.example` to a new file called `.env`.
2. Fill in the 4 required variables:
   ```
   DISCORD_TOKEN=your_bot_token
   DISCORD_CHANNEL_ID=the_channel_id
   EXAROTON_TOKEN=your_exaroton_api_token
   EXAROTON_SERVER_ID=your_server_id
   ```
   And if you want the playing-alone alert, also:
   ```
   DISCORD_MINECRAFT_ROLE_ID=the_role_id
   SOLO_ALERT_MINUTES=10
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## 6. Run it

```
npm start
```

If everything is configured correctly, you'll see something like this in the console:

```
Conectado a Discord como TuBot#1234
Escuchando el servidor "MiServidor" (estado actual: 0)
```

Leave the window open — as long as the process is running, the bot is listening.

## 7. Keep it running 24/7

For it to send notifications even when your computer is off, you need to run it on something that's always on: a cheap VPS, a Raspberry Pi at home, or a free/low-cost Node.js hosting service (Railway, Render, etc.). If you only run it on your laptop, it'll work, but only while the laptop is on and connected to the internet.

## Notes and limitations

- **Player list**: the exaroton API notes that the list of connected players "is not always available". In the vast majority of cases it comes through fine, but if you ever notice a join/leave notification didn't arrive, that's the cause.
