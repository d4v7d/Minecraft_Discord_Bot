import 'dotenv/config';
import { Client as ExarotonClient } from 'exaroton';
import { Client as DiscordClient, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const {
  DISCORD_TOKEN,
  DISCORD_CHANNEL_ID,
  EXAROTON_TOKEN,
  EXAROTON_SERVER_ID,
  DISCORD_MINECRAFT_ROLE_ID,
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID || !EXAROTON_TOKEN || !EXAROTON_SERVER_ID) {
  console.error(
    'Faltan variables de entorno. Revisa tu archivo .env (mira .env.example como referencia).'
  );
  process.exitCode = 1;
  throw new Error('Configuración incompleta: revisa tu archivo .env');
}

// El aviso de "jugando solo" es opcional: si no configuraste el rol, el
// bot sigue funcionando normal, solo que sin esa función.
if (!DISCORD_MINECRAFT_ROLE_ID) {
  console.warn(
    'DISCORD_MINECRAFT_ROLE_ID no está configurado — el aviso de "jugando solo" queda desactivado.'
  );
}

const SOLO_ALERT_MINUTES = Number(process.env.SOLO_ALERT_MINUTES) > 0
  ? Number(process.env.SOLO_ALERT_MINUTES)
  : 10;

// Códigos de estado oficiales de la API de exaroton
// https://developers.exaroton.com/#header-server-status
const STATUS = {
  OFFLINE: 0,
  ONLINE: 1,
  STARTING: 2,
  STOPPING: 3,
  RESTARTING: 4,
  SAVING: 5,
  LOADING: 6,
  CRASHED: 7,
  PENDING: 8,
  TRANSFERRING: 9,
  PREPARING: 10,
};

function isOnline(status) {
  return status === STATUS.ONLINE;
}

function isStopped(status) {
  return status === STATUS.OFFLINE || status === STATUS.CRASHED;
}

// ---- Clientes ----

const discord = new DiscordClient({ intents: [GatewayIntentBits.Guilds] });
const exaroton = new ExarotonClient(EXAROTON_TOKEN);

// ---- Estado en memoria ----

let announceChannel = null;
let lastStatus = null;
let lastPlayers = new Set();

// Evita procesar dos eventos de estado a la vez (por si exaroton manda
// el mismo evento duplicado casi al mismo tiempo por el websocket).
let processingStatus = false;
const pendingStatusQueue = [];

// Seguimiento de "jugando solo"
let wasSolo = false;
let soloTimer = null;
let soloPlayerName = null;

// ---- Utilidades de Discord ----

async function sendEmbed({ title, description, color, thumbnail, content }) {
  if (!announceChannel) return;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  try {
    await announceChannel.send({
      content: content || undefined,
      embeds: [embed],
      allowedMentions: content ? { roles: [DISCORD_MINECRAFT_ROLE_ID] } : undefined,
    });
  } catch (err) {
    console.error('Error enviando mensaje a Discord:', err);
  }
}

// Cabeza de la skin del jugador, usando mc-heads.net (gratis, sin API key,
// acepta el username directo). Tamaño en píxeles.
function skinHeadUrl(name) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/100`;
}

// ---- Lógica de jugadores ----
// Calcula quién entró/salió y ACTUALIZA lastPlayers de inmediato (síncrono),
// antes de mandar ningún mensaje. Así, si esta función se llama dos veces
// seguidas con la misma info, la segunda llamada ya no encuentra diferencias.

function diffPlayers(rawList) {
  const newSet = new Set(rawList || []);
  const joined = [...newSet].filter((name) => !lastPlayers.has(name));
  const left = [...lastPlayers].filter((name) => !newSet.has(name));

  lastPlayers = newSet; // commit inmediato, antes de cualquier await

  return { joined, left };
}

async function announcePlayerChanges({ joined, left }) {
  for (const name of joined) {
    await sendEmbed({
      title: '🟢 Jugador conectado',
      description: `**${name}** se unió al servidor.`,
      color: 0x57f287,
      thumbnail: skinHeadUrl(name),
    });
  }

  for (const name of left) {
    await sendEmbed({
      title: '🔴 Jugador desconectado',
      description: `**${name}** salió del servidor.`,
      color: 0xed4245,
      thumbnail: skinHeadUrl(name),
    });
  }
}

// ---- Lógica de "jugando solo" ----
// Se basa en players.count (más confiable que la lista, que la API marca
// como "no siempre disponible"). Arranca un timer al quedar exactamente en
// 1 jugador; lo cancela si deja de estar solo antes de que se cumpla el
// tiempo configurado.

function updateSoloTracking(count, rawList) {
  const isSolo = count === 1;

  if (isSolo && !wasSolo) {
    soloPlayerName = rawList && rawList.length === 1 ? rawList[0] : null;
    soloTimer = setTimeout(() => {
      sendSoloAlert(soloPlayerName);
    }, SOLO_ALERT_MINUTES * 60 * 1000);
  } else if (!isSolo && wasSolo) {
    if (soloTimer) {
      clearTimeout(soloTimer);
      soloTimer = null;
    }
    soloPlayerName = null;
  }

  wasSolo = isSolo;
}

async function sendSoloAlert(playerName) {
  if (!announceChannel || !DISCORD_MINECRAFT_ROLE_ID) return;

  const who = playerName ? `**${playerName}**` : 'Un jugador';

  await sendEmbed({
    title: '⚠️ Jugando solo',
    description: `${who} lleva ${SOLO_ALERT_MINUTES} minutos conectado sin compañía. ¡Recuerden la regla: no se puede jugar solo!`,
    color: 0xfee75c,
    thumbnail: playerName ? skinHeadUrl(playerName) : undefined,
    content: `<@&${DISCORD_MINECRAFT_ROLE_ID}>`,
  });
}

// ---- Lógica de estado del servidor ----
// Mismo principio: decidimos qué pasó y actualizamos lastStatus de forma
// síncrona primero, y solo después mandamos mensajes (que sí son async).

function diffStatus(server) {
  const status = server.status;
  const previousStatus = lastStatus;

  const justCameOnline = status === STATUS.ONLINE && previousStatus !== STATUS.ONLINE;
  const justStopped = isStopped(status) && !isStopped(previousStatus);

  lastStatus = status; // commit inmediato, antes de cualquier await

  let playerDiff = { joined: [], left: [] };
  if (isOnline(status)) {
    playerDiff = diffPlayers(server.players?.list);
    updateSoloTracking(server.players?.count ?? lastPlayers.size, server.players?.list);
  } else if (justStopped) {
    lastPlayers = new Set();
    updateSoloTracking(0, []);
  }

  return { status, justCameOnline, justStopped, playerDiff };
}

async function handleStatusChange(server) {
  // Procesamos los eventos en fila, uno a la vez, nunca en paralelo.
  if (processingStatus) {
    pendingStatusQueue.push(server);
    return;
  }
  processingStatus = true;

  try {
    const { status, justCameOnline, justStopped, playerDiff } = diffStatus(server);

    if (justCameOnline) {
      await sendEmbed({
        title: '🟢 Servidor encendido',
        description: `**${server.name}** está en línea y listo para jugar.`,
        color: 0x57f287,
      });
    }

    if (justStopped) {
      await sendEmbed({
        title: status === STATUS.CRASHED ? '💥 El servidor crasheó' : '🔴 Servidor apagado',
        description: `**${server.name}** ya no está en línea.`,
        color: 0xed4245,
      });
    }

    await announcePlayerChanges(playerDiff);
  } finally {
    processingStatus = false;
    const next = pendingStatusQueue.shift();
    if (next) {
      handleStatusChange(next).catch((err) => {
        console.error('Error manejando cambio de estado:', err);
      });
    }
  }
}

// ---- Arranque ----

discord.once('ready', async () => {
  console.log(`Conectado a Discord como ${discord.user.tag}`);

  const channel = await discord.channels.fetch(DISCORD_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error('El canal configurado no existe o no es un canal de texto.');
    process.exitCode = 1;
    discord.destroy();
    return;
  }
  announceChannel = channel;

  const server = exaroton.server(EXAROTON_SERVER_ID);
  await server.get();

  // Inicializamos el estado con la situación actual, para no mandar
  // avisos falsos de "se conectó" por jugadores que ya estaban dentro.
  lastStatus = server.status;
  lastPlayers = new Set(server.players?.list || []);
  wasSolo = server.players?.count === 1;
  if (wasSolo) {
    // Si ya estaba solo al arrancar el bot, empezamos a contar desde ahora.
    updateSoloTracking(0, []); // fuerza wasSolo=false internamente...
    updateSoloTracking(1, server.players?.list || []); // ...y arranca el timer limpio
  }

  server.subscribe();
  server.on('status', (updatedServer) => {
    handleStatusChange(updatedServer).catch((err) => {
      console.error('Error manejando cambio de estado:', err);
    });
  });

  console.log(`Escuchando el servidor "${server.name}" (estado actual: ${lastStatus})`);
});

discord.login(DISCORD_TOKEN);

process.on('unhandledRejection', (err) => {
  console.error('Promesa rechazada sin manejar:', err);
});
