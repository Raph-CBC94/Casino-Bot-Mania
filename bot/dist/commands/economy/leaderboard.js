"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const MEDALS = ['🥇', '🥈', '🥉'];
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Top 10 des joueurs les plus riches 👑'),
    async execute(interaction) {
        const rows = await (0, index_js_1.getLeaderboard)(interaction.guildId);
        if (!rows.length) {
            return interaction.reply({ content: 'Aucun joueur enregistré sur ce serveur.', ephemeral: true });
        }
        const lines = rows.map((u, i) => {
            const medal = MEDALS[i] ?? `**${i + 1}.**`;
            return `${medal} <@${u.user_id}> — **${u.balance.toLocaleString('fr-FR')} 🪙**`;
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.gold)
            .setTitle('👑 Classement — Top Richissimes')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Joue et monte dans le classement !' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
