import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { allCommands } from '../src/commands/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌  DISCORD_TOKEN et CLIENT_ID sont requis dans .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
  try {
    const body = allCommands.map(cmd => cmd.data.toJSON());
    console.log(`📡  Déploiement de ${body.length} commandes slash...`);

    // Deploy globally (may take up to 1h to propagate)
    await rest.put(Routes.applicationCommands(clientId!), { body });

    console.log(`✅  ${body.length} commandes déployées avec succès !`);
    console.log('⚠️  Les commandes globales peuvent prendre jusqu\'à 1h pour apparaître.');
    console.log('💡  Pour un déploiement instantané sur un serveur spécifique, définissez GUILD_ID dans .env');

    const guildId = process.env.GUILD_ID;
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId!, guildId), { body });
      console.log(`✅  Commandes déployées instantanément sur le serveur ${guildId} !`);
    }
  } catch (err) {
    console.error('❌  Erreur de déploiement:', err);
    process.exit(1);
  }
}

deploy();
