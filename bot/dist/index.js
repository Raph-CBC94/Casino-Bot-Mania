"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = exports.client = void 0;
// Charge .env en développement local uniquement (Render injecte les vars directement)
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv/config');
    }
    catch { }
}
const discord_js_1 = require("discord.js");
const index_js_1 = require("./database/index.js");
const index_js_2 = require("./commands/index.js");
const interactionCreate_js_1 = require("./events/interactionCreate.js");
const client_js_1 = require("./client.js");
const token = process.env.DISCORD_TOKEN;
if (!token)
    throw new Error('❌  DISCORD_TOKEN manquant dans les variables d\'environnement');
exports.client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.DirectMessages,
    ],
    partials: [discord_js_1.Partials.Channel],
});
(0, client_js_1.setClient)(exports.client);
exports.commands = new discord_js_1.Collection();
(0, index_js_2.loadCommands)(exports.commands);
exports.client.once(discord_js_1.Events.ClientReady, (c) => {
    console.log(`✅  ${c.user.tag} est en ligne — ${c.guilds.cache.size} serveur(s)`);
    setInterval(() => (0, index_js_1.cleanExpiredDuels)(), 60_000);
});
exports.client.on(discord_js_1.Events.InteractionCreate, interactionCreate_js_1.handleInteraction);
exports.client.login(token);
