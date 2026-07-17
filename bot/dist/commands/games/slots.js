"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🎯', '💎', '7️⃣'];
const WEIGHTS = [30, 25, 20, 12, 8, 3, 2];
const PAYOUTS = {
    '7️⃣': 50, '💎': 30, '🎯': 20,
    '🍇': 10, '🍊': 8, '🍋': 5, '🍒': 3,
};
function weightedRandom() {
    const total = WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
        r -= WEIGHTS[i];
        if (r <= 0)
            return SYMBOLS[i];
    }
    return SYMBOLS[0];
}
function spinReel() {
    return [weightedRandom(), weightedRandom(), weightedRandom()];
}
function computePayout(reel) {
    const [a, b, c] = reel;
    if (a === b && b === c) {
        const m = PAYOUTS[a] ?? 3;
        return { multiplier: m, label: `Jackpot triple ${a} !` };
    }
    if (a === b || b === c || a === c) {
        return { multiplier: 1.5, label: 'Deux identiques !' };
    }
    return { multiplier: 0, label: 'Aucune combinaison...' };
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('slots')
        .setDescription('🎰 Tente ta chance à la machine à sous !')
        .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),
    async execute(interaction) {
        const bet = interaction.options.getInteger('mise', true);
        const user = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        if (user.balance < bet) {
            return interaction.reply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(user.balance)} mais tu misais ${(0, economy_js_1.formatBalance)(bet)}.`)],
                ephemeral: true,
            });
        }
        const reel = spinReel();
        const { multiplier, label } = computePayout(reel);
        const gain = Math.floor(bet * multiplier) - bet;
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, gain);
        if (gain >= 0)
            await (0, index_js_1.addWin)(interaction.user.id, interaction.guildId);
        else
            await (0, index_js_1.addLoss)(interaction.user.id, interaction.guildId);
        const newBalance = user.balance + gain;
        const won = gain > 0;
        const push = gain === 0;
        const reelStr = `╔══════════════╗\n║ ${reel.join('  ')} ║\n╚══════════════╝`;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(won ? colors_js_1.Colors.gold : push ? colors_js_1.Colors.blue : colors_js_1.Colors.red)
            .setTitle('🎰 Machine à Sous')
            .setDescription(`${reelStr}\n\n${won ? '✨' : push ? '🔄' : '💀'} **${label}**`)
            .addFields({ name: '💰 Mise', value: (0, economy_js_1.formatBalance)(bet), inline: true }, { name: won ? '🤑 Gain' : '📉 Perte', value: (0, economy_js_1.formatBalance)(Math.abs(gain)), inline: true }, { name: '🏦 Solde', value: (0, economy_js_1.formatBalance)(newBalance), inline: true })
            .setFooter({ text: multiplier === 0 ? 'Retente ta chance !' : `Multiplicateur ×${multiplier}` })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
