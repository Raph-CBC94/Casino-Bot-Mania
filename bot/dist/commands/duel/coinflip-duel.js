"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('duel-coinflip')
        .setDescription('🪙 Défie un joueur au Pile ou Face !')
        .addUserOption(o => o.setName('adversaire').setDescription('Ton adversaire').setRequired(true))
        .addIntegerOption(o => o.setName('mise').setDescription('Montant misé par chacun').setRequired(true).setMinValue(10)),
    async execute(interaction) {
        const target = interaction.options.getUser('adversaire', true);
        const bet = interaction.options.getInteger('mise', true);
        if (target.bot || target.id === interaction.user.id)
            return interaction.reply({ content: '❌ Adversaire invalide.', ephemeral: true });
        const challenger = await (0, index_js_1.getUser)(interaction.user.id, interaction.guildId);
        if (challenger.balance < bet)
            return interaction.reply({ content: `❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(challenger.balance)}.`, ephemeral: true });
        const duelId = (0, economy_js_1.generateDuelId)();
        await (0, index_js_1.addBalance)(interaction.user.id, interaction.guildId, -bet);
        await (0, index_js_1.createDuel)(duelId, interaction.user.id, target.id, interaction.guildId, interaction.channelId, 'coinflip', bet);
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`duel_coinflip:accept:${duelId}`).setLabel('✅ Accepter').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`duel_coinflip:decline:${duelId}`).setLabel('❌ Refuser').setStyle(discord_js_1.ButtonStyle.Danger));
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.purple)
            .setTitle('🪙 Duel Coinflip')
            .setDescription(`<@${interaction.user.id}> défie <@${target.id}> au **Pile ou Face** !\n\nMise : ${(0, economy_js_1.formatBalance)(bet)} chacun\nPot total : ${(0, economy_js_1.formatBalance)(bet * 2)}\n\n<@${target.id}> tu as 5 minutes pour accepter !`)
            .setFooter({ text: 'Seul l\'adversaire peut accepter ou refuser' })
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
            const embed = new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red)
                .setTitle('🪙 Duel Coinflip — Refusé')
                .setDescription(`<@${duel.challenged_id}> a refusé le duel. Mise remboursée à <@${duel.challenger_id}>.`);
            return interaction.editReply({ embeds: [embed], components: [] });
        }
        // Accept
        const challenged = await (0, index_js_1.getUser)(duel.challenged_id, duel.guild_id);
        if (challenged.balance < duel.bet) {
            await (0, index_js_1.addBalance)(duel.challenger_id, duel.guild_id, duel.bet);
            await (0, index_js_1.deleteDuel)(duelId);
            return interaction.editReply({
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setDescription(`❌ <@${duel.challenged_id}> n'a pas assez de pièces ! Duel annulé.`)],
                components: [],
            });
        }
        await (0, index_js_1.addBalance)(duel.challenged_id, duel.guild_id, -duel.bet);
        await (0, index_js_1.deleteDuel)(duelId);
        const coin = Math.random() < 0.5 ? 'pile' : 'face';
        const winnerIsChallenger = coin === 'pile';
        const winnerId = winnerIsChallenger ? duel.challenger_id : duel.challenged_id;
        const loserId = winnerIsChallenger ? duel.challenged_id : duel.challenger_id;
        await (0, index_js_1.addBalance)(winnerId, duel.guild_id, duel.bet * 2);
        await (0, index_js_1.addWin)(winnerId, duel.guild_id);
        await (0, index_js_1.addLoss)(loserId, duel.guild_id);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.gold)
            .setTitle('🪙 Duel Coinflip — Résultat !')
            .setDescription(`La pièce tombe sur **${coin === 'pile' ? '🪙 Pile' : '💿 Face'}** !\n\n` +
            `🏆 Vainqueur : <@${winnerId}>\n` +
            `💀 Perdant : <@${loserId}>\n\n` +
            `<@${winnerId}> remporte ${(0, economy_js_1.formatBalance)(duel.bet * 2)} !`)
            .setTimestamp();
        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
