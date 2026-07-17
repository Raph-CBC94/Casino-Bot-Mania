"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('balance')
        .setDescription('Affiche ton solde de pièces 🪙')
        .addUserOption(o => o.setName('user').setDescription('Voir le solde d\'un autre joueur')),
    async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const user = await (0, index_js_1.getUser)(target.id, interaction.guildId);
        const ratio = user.wins + user.losses > 0
            ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1)
            : '0.0';
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.gold)
            .setTitle(`💰 Portefeuille de ${target.displayName}`)
            .setThumbnail(target.displayAvatarURL())
            .addFields({ name: '🪙 Solde', value: (0, economy_js_1.formatBalance)(user.balance), inline: true }, { name: '🏆 Victoires', value: `\`${user.wins}\``, inline: true }, { name: '💀 Défaites', value: `\`${user.losses}\``, inline: true }, { name: '📊 Ratio V/D', value: `\`${ratio}%\``, inline: true })
            .setFooter({ text: 'Casino Discord • /daily pour gagner des pièces' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
