"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildShopEmbed = buildShopEmbed;
exports.refreshShopMessage = refreshShopMessage;
exports.postShopMessage = postShopMessage;
const discord_js_1 = require("discord.js");
const client_js_1 = require("../client.js");
const index_js_1 = require("../database/index.js");
const colors_js_1 = require("./colors.js");
const economy_js_1 = require("./economy.js");
async function buildShopEmbed(guildId) {
    const items = await (0, index_js_1.getShopItems)(guildId);
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(colors_js_1.Colors.gold)
        .setTitle('🛒 Boutique du Serveur')
        .setFooter({ text: 'Clique sur un article pour l\'acheter !' })
        .setTimestamp();
    if (!items.length) {
        embed.setDescription('*La boutique est vide pour le moment...*\nUn admin peut ajouter des articles avec `/additem`.');
        return { embed, rows: [] };
    }
    const desc = items.map(item => `${item.emoji} **${item.name}** — ${(0, economy_js_1.formatBalance)(item.price)}\n> ${item.description}${item.role_id ? `\n> Rôle attribué : <@&${item.role_id}>` : ''}`).join('\n\n');
    embed.setDescription(desc);
    // Build button rows (max 5 par row, max 5 rows = 25 boutons)
    const rows = [];
    for (let i = 0; i < Math.min(items.length, 25); i++) {
        const rowIdx = Math.floor(i / 5);
        if (!rows[rowIdx])
            rows[rowIdx] = new discord_js_1.ActionRowBuilder();
        rows[rowIdx].addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`shop_buy:${items[i].id}`)
            .setLabel(`${items[i].emoji} ${items[i].name}`)
            .setStyle(discord_js_1.ButtonStyle.Secondary));
    }
    return { embed, rows };
}
async function refreshShopMessage(guildId) {
    const settings = await (0, index_js_1.getGuildSettings)(guildId);
    if (!settings?.shop_channel_id || !settings.shop_message_id)
        return;
    try {
        const client = (0, client_js_1.getClient)();
        const channel = await client.channels.fetch(settings.shop_channel_id);
        if (!channel)
            return;
        const message = await channel.messages.fetch(settings.shop_message_id);
        const { embed, rows } = await buildShopEmbed(guildId);
        await message.edit({ embeds: [embed], components: rows });
    }
    catch {
        // Message supprimé — on ignore
    }
}
async function postShopMessage(guildId, channelId) {
    try {
        const client = (0, client_js_1.getClient)();
        const channel = await client.channels.fetch(channelId);
        if (!channel)
            return null;
        const { embed, rows } = await buildShopEmbed(guildId);
        const msg = await channel.send({ embeds: [embed], components: rows });
        await (0, index_js_1.setGuildSettings)(guildId, channelId, msg.id);
        return msg.id;
    }
    catch {
        return null;
    }
}
