"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('duel-dice')
        .setDescription('🎲 Défie un joueur aux dés — le plus haut gagne !')
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
        await (0, index_js_1.createDuel)(duelId, interaction.user.id, target.id, interaction.guildId, interaction.channelId, 'dice', bet);
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`duel_dice:accept:${duelId}`).setLabel('✅ Accepter').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`duel_dice:decline:${duelId}`).setLabel('❌ Refuser').setStyle(discord_js_1.ButtonStyle.Danger));
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.cyan)
            .setTitle('🎲 Duel Dés')
            .setDescription(`<@${interaction.user.id}> défie <@${target.id}> aux **Dés** !\n\nMise : ${(0, economy_js_1.formatBalance)(bet)} chacun\nPot total : ${(0, economy_js_1.formatBalance)(bet * 2)}\n\n<@${target.id}> tu as 5 minutes pour accepter !`)
            .setFooter({ text: 'Le plus haut résultat gagne • Égalité = re-lancé !' })
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
                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_js_1.Colors.red).setTitle('🎲 Duel Dés — Refusé')
                        .setDescription(`<@${duel.challenged_id}> a refusé le duel. Mise remboursée.`)],
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
        await (0, index_js_1.deleteDuel)(duelId);
        const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let cRoll = (0, economy_js_1.randomInt)(1, 6);
        let dRoll = (0, economy_js_1.randomInt)(1, 6);
        let rerolls = 0;
        while (cRoll === dRoll && rerolls < 5) {
            cRoll = (0, economy_js_1.randomInt)(1, 6);
            dRoll = (0, economy_js_1.randomInt)(1, 6);
            rerolls++;
        }
        const tie = cRoll === dRoll;
        let winnerId = '';
        let loserId = '';
        if (!tie) {
            if (cRoll > dRoll) {
                winnerId = duel.challenger_id;
                loserId = duel.challenged_id;
            }
            else {
                winnerId = duel.challenged_id;
                loserId = duel.challenger_id;
            }
        }
        if (!tie) {
            await (0, index_js_1.addBalance)(winnerId, duel.guild_id, duel.bet * 2);
            await (0, index_js_1.addWin)(winnerId, duel.guild_id);
            await (0, index_js_1.addLoss)(loserId, duel.guild_id);
        }
        else {
            await (0, index_js_1.addBalance)(duel.challenger_id, duel.guild_id, duel.bet);
            await (0, index_js_1.addBalance)(duel.challenged_id, duel.guild_id, duel.bet);
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(tie ? colors_js_1.Colors.blue : colors_js_1.Colors.gold)
            .setTitle('🎲 Duel Dés — Résultat !')
            .setDescription(`<@${duel.challenger_id}> : **${DICE_FACES[cRoll - 1]} ${cRoll}**\n` +
            `<@${duel.challenged_id}> : **${DICE_FACES[dRoll - 1]} ${dRoll}**\n\n` +
            (tie
                ? '🤝 Égalité ! Mises remboursées.'
                : `🏆 Vainqueur : <@${winnerId}> remporte ${(0, economy_js_1.formatBalance)(duel.bet * 2)} !`))
            .setTimestamp();
        await interaction.editReply({ embeds: [embed], components: [] });
    },
};
