"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Pile ou Face — double ou rien !')
        .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
        .addStringOption(o => o.setName('choix').setDescription('Pile ou Face ?').setRequired(true)
        .addChoices({ name: '🪙 Pile', value: 'pile' }, { name: '💿 Face', value: 'face' })),
    async execute(interaction) {
        const bet = interaction.options.getInteger('mise', true);
        const choix = interaction.options.getString('choix', true);
        const user = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        if (user.balance < bet) {
            return interaction.reply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(user.balance)}.`)],
                ephemeral: true,
            });
        }
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const won = result === choix;
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, won ? bet : -bet);
        won
            ? await (0, index_js_1.addWin)(interaction.user.id, interaction.guildId)
            : await (0, index_js_1.addLoss)(interaction.user.id, interaction.guildId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(won ? colors_js_1.Colors.green : colors_js_1.Colors.red)
            .setTitle(`🪙 Coinflip — ${won ? 'GAGNÉ !' : 'PERDU !'}`)
            .setDescription(`Tu as joué **${choix === 'pile' ? '🪙 Pile' : '💿 Face'}**\n` +
            `La pièce est tombée sur **${result === 'pile' ? '🪙 Pile' : '💿 Face'}**\n\n` +
            `${won ? '🎉 Tu doubles ta mise !' : '😭 Tu perds ta mise !'}`)
            .addFields({ name: '💰 Mise', value: (0, economy_js_1.formatBalance)(bet), inline: true }, { name: won ? '🤑 Gain' : '📉 Perte', value: (0, economy_js_1.formatBalance)(bet), inline: true }, { name: '🏦 Solde', value: (0, economy_js_1.formatBalance)(user.balance + (won ? bet : -bet)), inline: true })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
