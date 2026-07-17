// Charge .env en développement local uniquement (Render injecte les vars directement)
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv/config'); } catch {}
}

import {
  Client, Collection, Events, GatewayIntentBits,
  REST, Routes, TextChannel,
} from 'discord.js';
import { cleanExpiredDuels, getLeaderboard, getAllLeaderboardConfigs } from './database/index.js';
import { loadCommands, allCommands } from './commands/index.js';
import { handleInteraction } from './events/interactionCreate.js';
import { setClient } from './client.js';
import { buildLeaderboardEmbed } from './commands/economy/leaderboard.js';

const token   = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
if (!token)   throw new Error('❌  DISCORD_TOKEN manquant');
if (!guildId) throw new Error('❌  GUILD_ID manquant');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

setClient(client);

export const commands = new Collection<string, Command>();
loadCommands(commands);

// ── ClientReady ────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`✅  ${c.user.tag} est en ligne — ${c.guilds.cache.size} serveur(s)`);

  // Auto-enregistrement des commandes au démarrage (guild-only = instantané)
  try {
    const rest  = new REST().setToken(token!);
    const body  = allCommands.map(cmd => cmd.data.toJSON());
    await rest.put(Routes.applicationGuildCommands(c.user.id, guildId!), { body });
    console.log(`📡  ${body.length} commandes enregistrées sur le serveur ${guildId}`);
  } catch (err) {
    console.error('❌  Erreur enregistrement commandes:', err);
  }

  // Nettoyage des duels expirés toutes les 60s
  setInterval(() => cleanExpiredDuels(), 60_000);

  // Leaderboard live — actualisation toutes les 60s
  setInterval(async () => {
    try {
      const configs = await getAllLeaderboardConfigs();
      for (const config of configs) {
        if (!config.leaderboard_channel_id || !config.leaderboard_message_id) continue;
        try {
          const rows    = await getLeaderboard(config.guild_id, 10);
          const embed   = buildLeaderboardEmbed(rows);
          const channel = await c.channels.fetch(config.leaderboard_channel_id);
          if (!channel || !channel.isTextBased()) continue;
          const msg = await (channel as TextChannel).messages.fetch(config.leaderboard_message_id);
          await msg.edit({ embeds: [embed] });
        } catch {
          // Message supprimé ou salon inaccessible — on ignore
        }
      }
    } catch {
      // Supabase temporairement indisponible
    }
  }, 60_000);
});

client.on(Events.InteractionCreate, handleInteraction);
client.login(token);

// Serveur HTTP minimal requis par Render (Web Service)
import { createServer } from 'node:http';
const port = process.env.PORT || 3000;
createServer((_, res) => { res.writeHead(200); res.end('Bot en ligne ✅'); }).listen(port, () => {
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
