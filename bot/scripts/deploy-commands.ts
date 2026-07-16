import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { allCommands } from '../src/commands/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('❌  DISCORD_TOKEN, CLIENT_ID et GUILD_ID sont requis');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
  try {
    const body = allCommands.map(cmd => cmd.data.toJSON());

    // 1. Effacer toutes les commandes globales (déploiement précédent)
    console.log('🧹  Suppression des commandes globales...');
    await rest.put(Routes.applicationCommands(clientId!), { body: [] });
    console.log('✅  Commandes globales effacées.');

    // 2. Déployer uniquement sur le serveur spécifié (instantané)
    console.log(`📡  Déploiement de ${body.length} commandes sur le serveur ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId!, guildId!), { body });
    console.log(`✅  ${body.length} commandes déployées instantanément sur ton serveur !`);
    console.log('🔒  Aucune autre commande ne recevra ces commandes — seulement ton serveur.');
  } catch (err) {
    console.error('❌  Erreur de déploiement:', err);
    process.exit(1);
  }
}

deploy();
