// Charge .env en développement local uniquement (Render injecte les vars directement)
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv/config'); } catch {}
}
import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';
import { cleanExpiredDuels } from './database/index.js';
import { loadCommands } from './commands/index.js';
import { handleInteraction } from './events/interactionCreate.js';
import { setClient } from './client.js';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('❌  DISCORD_TOKEN manquant dans les variables d\'environnement');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

setClient(client);

export const commands = new Collection<string, Command>();
loadCommands(commands);

client.once(Events.ClientReady, (c) => {
  console.log(`✅  ${c.user.tag} est en ligne — ${c.guilds.cache.size} serveur(s)`);
  setInterval(() => cleanExpiredDuels(), 60_000);
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(token);

// Serveur HTTP minimal requis par Render (Web Service)
import { createServer } from 'node:http';
const port = process.env.PORT || 3000;
createServer((_, res) => { res.writeHead(200); res.end('Bot en ligne'); }).listen(port, () => {
  console.log(`🌐 Serveur HTTP en écoute sur le port ${port}`);
});

export interface Command {
  data: { name: string; toJSON: () => unknown };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (interaction: import('discord.js').ChatInputCommandInteraction) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleButton?: (interaction: import('discord.js').ButtonInteraction) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelect?: (interaction: import('discord.js').StringSelectMenuInteraction) => Promise<any>;
}
