// Script de ayuda: imprime todos tus servidores de exaroton con su ID,
// para que sepas qué poner en EXAROTON_SERVER_ID dentro de tu archivo .env
//
// Uso: npm run list-servers

import 'dotenv/config';
import { Client as ExarotonClient } from 'exaroton';

const token = process.env.EXAROTON_TOKEN;

if (!token) {
  console.error('Falta EXAROTON_TOKEN en tu archivo .env');
  process.exit(1);
}

const client = new ExarotonClient(token);

try {
  const account = await client.getAccount();
  console.log(`Cuenta: ${account.name} — ${account.credits} créditos disponibles\n`);

  const servers = await client.getServers();

  if (servers.length === 0) {
    console.log('No se encontraron servidores en esta cuenta.');
  } else {
    console.log('Tus servidores:');
    for (const server of servers) {
      console.log(`- ${server.name}  ->  ID: ${server.id}`);
    }
  }
} catch (err) {
  console.error('Error consultando la API de exaroton:', err.message || err);
  process.exit(1);
}
