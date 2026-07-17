"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Affiche ton inventaire'),
    async execute(interaction) {
        const items = await (0, index_js_1.getUserItems)(interaction.user.id, interaction.guildId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.purple)
            .setTitle(`🎒 Inventaire de ${interaction.user.displayName}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
        if (!items.length) {
            embed.setDescription('*Ton inventaire est vide !*\nUtilise `/shop` pour acheter des articles.');
        }
        else {
            embed.setDescription(items.map(i => `${i.emoji} **${i.name}** ×${i.quantity}\n> ${i.description} — Valeur : ${(0, economy_js_1.formatBalance)(i.price)}`).join('\n\n'));
        }
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
