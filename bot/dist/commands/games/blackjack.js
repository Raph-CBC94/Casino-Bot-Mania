"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
const games = new Map();
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['♠', '♥', '♦', '♣'];
function drawCard() {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const val = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank);
    return { val, str: `${rank}${suit}` };
}
function handValue(cards) {
    let total = cards.reduce((s, c) => s + c.val, 0);
    let aces = cards.filter(c => c.str.startsWith('A')).length;
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
}
function handStr(cards) {
    return cards.map(c => `\`${c.str}\``).join(' ');
}
function buildButtons(gameId, canDouble) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`bj:hit:${gameId}`).setLabel('Tirer 🃏').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`bj:stand:${gameId}`).setLabel('Rester ✋').setStyle(discord_js_1.ButtonStyle.Secondary), ...(canDouble ? [new discord_js_1.ButtonBuilder().setCustomId(`bj:double:${gameId}`).setLabel('Double ×2 💰').setStyle(discord_js_1.ButtonStyle.Danger)] : []));
}
function buildEmbed(game, hideDealer = true) {
    const pv = handValue(game.player);
    const dv = hideDealer ? game.dealer[0].val : handValue(game.dealer);
    const dealerDisplay = hideDealer
        ? `${handStr([game.dealer[0]])} \`??\``
        : handStr(game.dealer);
    return new discord_js_1.EmbedBuilder()
        .setColor(colors_js_1.Colors.dark)
        .setTitle('🃏 Blackjack')
        .addFields({ name: `Dealer (${hideDealer ? '?' : dv})`, value: dealerDisplay, inline: false }, { name: `Toi (${pv})`, value: handStr(game.player), inline: false }, { name: '💰 Mise', value: (0, economy_js_1.formatBalance)(game.bet), inline: true });
}
async function endGame(interaction, game, gameId, outcome) {
    games.delete(gameId);
    const user = await (0, index_js_1.getUser)(game.userId, game.guildId);
    let gain = 0;
    let resultText = '';
    let color = colors_js_1.Colors.blue;
    if (outcome === 'blackjack') {
        gain = Math.floor(game.bet * 1.5);
        resultText = '🌟 BLACKJACK ! Tu gagnes ×2.5 !';
        color = colors_js_1.Colors.gold;
        await (0, index_js_1.addWin)(game.userId, game.guildId);
    }
    else if (outcome === 'win') {
        gain = game.bet;
        resultText = '✅ Tu gagnes !';
        color = colors_js_1.Colors.green;
        await (0, index_js_1.addWin)(game.userId, game.guildId);
    }
    else if (outcome === 'loss') {
        gain = -game.bet;
        resultText = '❌ Tu perds !';
        color = colors_js_1.Colors.red;
        await (0, index_js_1.addLoss)(game.userId, game.guildId);
    }
    else {
        resultText = '🤝 Égalité — mise remboursée';
        color = colors_js_1.Colors.blue;
    }
    await (0, index_js_1.addBalance)(game.userId, game.guildId, gain);
    const newBalance = user.balance + gain;
    const embed = buildEmbed(game, false)
        .setColor(color)
        .setTitle(`🃏 Blackjack — ${resultText}`)
        .addFields({ name: gain >= 0 ? '🤑 Gain' : '📉 Perte', value: (0, economy_js_1.formatBalance)(Math.abs(gain)), inline: true }, { name: '🏦 Solde', value: (0, economy_js_1.formatBalance)(newBalance), inline: true })
        .setTimestamp();
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [] });
    }
    else {
        await interaction.reply({ embeds: [embed] });
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('🃏 Joue au Blackjack contre le dealer !')
        .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),
    async execute(interaction) {
        const bet = interaction.options.getInteger('mise', true);
        const user = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        const gameId = `${interaction.user.id}:${interaction.guildId}`;
        if (games.has(gameId)) {
            return interaction.reply({ content: '⚠️ Tu as déjà une partie en cours !', ephemeral: true });
        }
        if (user.balance < bet) {
            return interaction.reply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(user.balance)}.`)],
                ephemeral: true,
            });
        }
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, -bet);
        const player = [drawCard(), drawCard()];
        const dealer = [drawCard(), drawCard()];
        const game = { player, dealer, bet, userId: interaction.user.id, guildId: interaction.guildId, doubled: false, startTime: Date.now() };
        games.set(gameId, game);
        // Blackjack immédiat
        if (handValue(player) === 21) {
            await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, bet); // refund
            return endGame(interaction, game, gameId, 'blackjack');
        }
        const embed = buildEmbed(game);
        const row = buildButtons(gameId, user.balance - bet >= bet);
        await interaction.reply({ embeds: [embed], components: [row] });
        // Auto-clean après 5 min
        setTimeout(async () => {
            if (games.has(gameId)) {
                games.delete(gameId);
                await (0, index_js_1.addLoss)(interaction.user.id, interaction.guildId);
            }
        }, 300_000);
    },
    async handleButton(interaction) {
        const [, action, gameId] = interaction.customId.split(':');
        const game = games.get(gameId);
        if (!game) {
            return interaction.reply({ content: '⌛ Partie expirée, relance /blackjack.', ephemeral: true });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: '❌ Ce n\'est pas ta partie !', ephemeral: true });
        }
        await interaction.deferUpdate();
        if (action === 'hit' || action === 'double') {
            if (action === 'double') {
                const currentUser = await (0, index_js_1.getUser)(game.userId, game.guildId);
                if (currentUser.balance < game.bet) {
                    await interaction.followUp({ content: '❌ Solde insuffisant pour doubler !', ephemeral: true });
                    return;
                }
                await (0, index_js_1.addBalance)(game.userId, game.guildId, -game.bet);
                game.bet *= 2;
                game.doubled = true;
            }
            game.player.push(drawCard());
            const pv = handValue(game.player);
            if (pv > 21)
                return endGame(interaction, game, gameId, 'loss');
            if (pv === 21 || game.doubled) {
                return handleStand(interaction, game, gameId);
            }
            const embed = buildEmbed(game);
            const row = buildButtons(gameId, false);
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
        else if (action === 'stand') {
            await handleStand(interaction, game, gameId);
        }
    },
};
async function handleStand(interaction, game, gameId) {
    while (handValue(game.dealer) < 17)
        game.dealer.push(drawCard());
    const pv = handValue(game.player);
    const dv = handValue(game.dealer);
    let outcome;
    if (dv > 21 || pv > dv)
        outcome = 'win';
    else if (dv > pv)
        outcome = 'loss';
    else
        outcome = 'push';
    await endGame(interaction, game, gameId, outcome);
}
