"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('dice')
        .setDescription('🎲 Devine le résultat du dé — ×5 si exact !')
        .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
        .addIntegerOption(o => o.setName('chiffre').setDescription('Ton chiffre (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)),
    async execute(interaction) {
        const bet = interaction.options.getInteger('mise', true);
        const guess = interaction.options.getInteger('chiffre', true);
        const user = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        if (user.balance < bet) {
            return interaction.reply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(user.balance)}.`)],
                ephemeral: true,
            });
        }
        const roll = (0, economy_js_1.randomInt)(1, 6);
        const diff = Math.abs(roll - guess);
        let multiplier = 0;
        let resultLabel = '';
        if (diff === 0) {
            multiplier = 5;
            resultLabel = '🎯 EXACT ! ×5 !';
        }
        else if (diff === 1) {
            multiplier = 1.5;
            resultLabel = '👌 Presque ! ×1.5';
        }
        else {
            resultLabel = '❌ Raté !';
        }
        const gain = Math.floor(bet * multiplier) - bet;
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, gain);
        gain >= 0
            ? await (0, index_js_1.addWin)(interaction.user.id, interaction.guildId)
            : await (0, index_js_1.addLoss)(interaction.user.id, interaction.guildId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(multiplier >= 1 ? colors_js_1.Colors.green : colors_js_1.Colors.red)
            .setTitle('🎲 Lancer de Dé')
            .setDescription(`Tu as joué : **${DICE_FACES[guess - 1]} ${guess}**\n` +
            `Résultat : **${DICE_FACES[roll - 1]} ${roll}**\n\n` +
            `**${resultLabel}**`)
            .addFields({ name: '💰 Mise', value: (0, economy_js_1.formatBalance)(bet), inline: true }, { name: gain >= 0 ? '🤑 Gain' : '📉 Perte', value: (0, economy_js_1.formatBalance)(Math.abs(gain)), inline: true }, { name: '🏦 Solde', value: (0, economy_js_1.formatBalance)(user.balance + gain), inline: true })
            .setFooter({ text: 'Exact = ×5 • ±1 = ×1.5 • Autre = Perdu' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
