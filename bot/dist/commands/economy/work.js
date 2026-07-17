"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
const JOBS = [
    { label: 'dealer de casino', emoji: '🎰' },
    { label: 'croupier', emoji: '🃏' },
    { label: 'vigile', emoji: '💪' },
    { label: 'barman VIP', emoji: '🍸' },
    { label: 'comptable louche', emoji: '📊' },
    { label: 'chauffeur de limousine', emoji: '🚗' },
    { label: 'chef de rang', emoji: '🍽️' },
    { label: 'testeur de machines à sous', emoji: '🎲' },
];
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('work')
        .setDescription('Travaille pour gagner des pièces 💼 (cooldown 1h)'),
    async execute(interaction) {
        const user = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - user.work_last;
        const remaining = economy_js_1.WORK_COOLDOWN - elapsed;
        if (elapsed < economy_js_1.WORK_COOLDOWN) {
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_js_1.Colors.orange)
                .setTitle('😴 T\'es en pause !')
                .setDescription(`Reprends le boulot dans **${m}m ${s}s**`)
                .setFooter({ text: 'Le casino t\'attend' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const earned = (0, economy_js_1.randomInt)(economy_js_1.WORK_MIN, economy_js_1.WORK_MAX);
        const job = JOBS[Math.floor(Math.random() * JOBS.length)];
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, earned);
        await (0, index_js_1.setWorkLast)(interaction.user.id, interaction.guildId, now);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.teal)
            .setTitle(`${job.emoji} Travail terminé !`)
            .setDescription(`Tu as bossé comme **${job.label}** et gagné ${(0, economy_js_1.formatBalance)(earned)} !\nNouveau solde : ${(0, economy_js_1.formatBalance)(user.balance + earned)}`)
            .setFooter({ text: 'Reviens dans 1h pour retravailler' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
