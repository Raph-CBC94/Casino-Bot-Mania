"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('duel-roulette')
        .setDescription('🎡 Défie un joueur à la Roulette — choisis ta couleur !')
        .addUserOption(o => o.setName('adversaire').setDescription('Ton adversaire').setRequired(true))
        .addIntegerOption(o => o.setName('mise').setDescription('Montant misé par chacun').setRequired(true).setMinValue(10))
        .addStringOption(o => o.setName('couleur').setDescription('Ta couleur').setRequired(true)
        .addChoices({ name: '🔴 Rouge', value: 'rouge' }, { name: '⚫ Noir', value: 'noir' })),
    async execute(interaction) {
        const target = interaction.options.getUser('adversaire', true);
        const bet = interaction.options.getInteger('mise', true);
        const color = interaction.options.getString('couleur', true);
        if (target.bot || target.id === interaction.user.id)
            return interaction.reply({ content: '❌ Adversaire invalide.', ephemeral: true });
        const challenger = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        if (challenger.balance < bet)
            return interaction.reply({ content: `❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(challenger.balance)}.`, ephemeral: true });
        const duelId = (0, economy_js_1.generateDuelId)();
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, -bet);
        await (0, index_js_1.createDuel)(duelId, interaction.user.id, target.id, interaction.guildId, interaction.channelId, 'roulette', bet);
        await (0, index_js_1.updateDuelData)(duelId, { challengerColor: color });
        const oppositeColor = color === 'rouge' ? 'noir' : 'rouge';
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`duel_roulette:accept:${duelId}`).setLabel(`✅ Accepter (${oppositeColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'})`).setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`duel_roulette:decline:${duelId}`).setLabel('❌ Refuser').setStyle(discord_js_1.ButtonStyle.Danger));
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.purple)
            .setTitle('🎡 Duel Roulette')
            .setDescription(`<@${interaction.user.id}> défie <@${target.id}> à la **Roulette** !\n\n` +
            `<@${interaction.user.id}> joue **${color === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n` +
            `<@${target.id}> jouera **${oppositeColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n\n` +
            `Mise : ${(0, economy_js_1.formatBalance)(bet)} chacun\nPot : ${(0, economy_js_1.formatBalance)(bet * 2)}\n\n` +
            `⚠️ Si **🟢 0** sort, les deux perdent !`)
            .setFooter({ text: 'Tu as 5 minutes pour répondre' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], components: [row] });
    },
    async handleButton(interaction) {
        const [, action, duelId] = interaction.customId.split(':');
        const duel = await (0, index_js_1.getDuel)(duelId);
        if (!duel)
            return interaction.reply({ content: '⌛ Ce duel a expiré.', ephemeral: true });
        if (interaction.user.id !== duel.challenged_id)
            return interaction.reply({ content: '❌ Ce duel ne te concerne pas !', ephemeral: true });
        if (duel.status !== 'pending')
            return interaction.reply({ content: '⌛ Ce duel est déjà terminé.', ephemeral: true });
        await interaction.deferUpdate();
        if (action === 'decline') {
            await (0, index_js_1.addBalance)(duel.challenger_id, duel.guild_id, duel.bet);
            await (0, index_js_1.deleteDuel)(duelId);
            return interaction.editReply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setTitle('🎡 Duel Roulette — Refusé')
                        .setDescription(`<@${duel.challenged_id}> a refusé. Mise remboursée.`)],
                components: [],
            });
        }
        const challenged = await (0, index_js_1.getUser)(duel.challenged_id, duel.guild_id);
        if (challenged.balance < duel.bet) {
            await (0, index_js_1.addBalance)(duel.challenger_id, duel.guild_id, duel.bet);
            await (0, index_js_1.deleteDuel)(duelId);
            return interaction.editReply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setDescription(`❌ <@${duel.challenged_id}> n'a pas assez de pièces !`)],
                components: [],
            });
        }
        await (0, index_js_1.addBalance)(duel.challenged_id, duel.guild_id, -duel.bet);
        const data = JSON.parse(duel.data);
        const challengerColor = data.challengerColor;
        const challengedColor = challengerColor === 'rouge' ? 'noir' : 'rouge';
        await (0, index_js_1.deleteDuel)(duelId);
        const spin = (0, economy_js_1.randomInt)(0, 36);
        const isRed = spin > 0 && RED_NUMBERS.has(spin);
        const spinColor = spin === 0 ? null : isRed ? 'rouge' : 'noir';
        const colorEmoji = spin === 0 ? '🟢' : isRed ? '🔴' : '⚫';
        let embed;
        if (spinColor === null) {
            embed = new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.green).setTitle('🎡 Duel Roulette — 0 ! House Wins')
                .setDescription(`La bille s'arrête sur **🟢 0** !\nLes deux joueurs perdent leur mise.\nLe casino s'enrichit 😈`).setTimestamp();
        }
        else {
            const challengerWon = spinColor === challengerColor;
            const winnerId = challengerWon ? duel.challenger_id : duel.challenged_id;
            const loserId = challengerWon ? duel.challenged_id : duel.challenger_id;
            await (0, index_js_1.addBalance)(winnerId, duel.guild_id, duel.bet * 2);
            await (0, index_js_1.addWin)(winnerId, duel.guild_id);
            await (0, index_js_1.addLoss)(loserId, duel.guild_id);
            embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_js_1.Colors.gold)
                .setTitle('🎡 Duel Roulette — Résultat !')
                .setDescription(`La bille s'arrête sur **${colorEmoji} ${spin}**\n\n` +
                `<@${duel.challenger_id}> jouait **${challengerColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n` +
                `<@${duel.challenged_id}> jouait **${challengedColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n\n` +
                `🏆 Vainqueur : <@${winnerId}> remporte ${(0, economy_js_1.formatBalance)(duel.bet * 2)} !`).setTimestamp();
        }
        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
