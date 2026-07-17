"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Réclame tes ${economy_js_1.DAILY_AMOUNT} 🪙 quotidiens`),
    async execute(interaction) {
        const user = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - user.daily_last;
        const remaining = economy_js_1.DAILY_COOLDOWN - elapsed;
        if (elapsed < economy_js_1.DAILY_COOLDOWN) {
            const h = Math.floor(remaining / 3600);
            const m = Math.floor((remaining % 3600) / 60);
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_js_1.Colors.red)
                .setTitle('⏳ Déjà réclamé !')
                .setDescription(`Reviens dans **${h}h ${m}m** pour ton prochain daily.`)
                .setFooter({ text: 'Patience c\'est une vertu 🙏' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, economy_js_1.DAILY_AMOUNT);
        await (0, index_js_1.setDailyLast)(interaction.user.id, interaction.guildId, now);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.green)
            .setTitle('🎁 Daily réclamé !')
            .setDescription(`Tu as reçu ${(0, economy_js_1.formatBalance)(economy_js_1.DAILY_AMOUNT)} !\nSolde : ${(0, economy_js_1.formatBalance)(user.balance + economy_js_1.DAILY_AMOUNT)}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Reviens demain pour plus 🔥' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
