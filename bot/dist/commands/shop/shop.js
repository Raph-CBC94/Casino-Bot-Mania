"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const shopMessage_js_1 = require("../../utils/shopMessage.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Affiche la boutique du serveur'),
    async execute(interaction) {
        const { embed, rows } = await (0, shopMessage_js_1.buildShopEmbed)(interaction.guildId);
        await interaction.reply({ embeds: [embed], components: rows, ephemeral: false });
    },
};
