import {
  ActionRowBuilder, ButtonBuilder, ButtonInteraction,
  ButtonStyle, ChatInputCommandInteraction, EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import {
  createDuel, deleteDuel, getDuel, getUser,
  addBalance, addWin, addLoss,
} from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance, generateDuelId } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('duel-coinflip')
    .setDescription('🪙 Défie un joueur au Pile ou Face !')
    .addUserOption(o => o.setName('adversaire').setDescription('Ton adversaire').setRequired(true))
    .addIntegerOption(o => o.setName('mise').setDescription('Montant misé par chacun').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('adversaire', true);
    const bet = interaction.options.getInteger('mise', true);

    if (target.bot || target.id === interaction.user.id)
      return interaction.reply({ content: '❌ Adversaire invalide.', ephemeral: true });

    const challenger = await getUser(interaction.user.id, interaction.guildId!);
    if (challenger.balance < bet)
      return interaction.reply({ content: `❌ Solde insuffisant ! Tu as ${formatBalance(challenger.balance)}.`, ephemeral: true });

    const duelId = generateDuelId();
    await addBalance(interaction.user.id, interaction.guildId!, -bet);
    await createDuel(duelId, interaction.user.id, target.id, interaction.guildId!, interaction.channelId, 'coinflip', bet);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`duel_coinflip:accept:${duelId}`).setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`duel_coinflip:decline:${duelId}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(Colors.purple)
      .setTitle('🪙 Duel Coinflip')
      .setDescription(`<@${interaction.user.id}> défie <@${target.id}> au **Pile ou Face** !\n\nMise : ${formatBalance(bet)} chacun\nPot total : ${formatBalance(bet * 2)}\n\n<@${target.id}> tu as 5 minutes pour accepter !`)
      .setFooter({ text: 'Seul l\'adversaire peut accepter ou refuser' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, action, duelId] = interaction.customId.split(':');
    const duel = await getDuel(duelId);

    if (!duel) return interaction.reply({ content: '⌛ Ce duel a expiré.', ephemeral: true });
    if (interaction.user.id !== duel.challenged_id)
      return interaction.reply({ content: '❌ Ce duel ne te concerne pas !', ephemeral: true });
    if (duel.status !== 'pending')
      return interaction.reply({ content: '⌛ Ce duel est déjà terminé.', ephemeral: true });

    await interaction.deferUpdate();

    if (action === 'decline') {
      await addBalance(duel.challenger_id, duel.guild_id, duel.bet);
      await deleteDuel(duelId);
      const embed = new EmbedBuilder().setColor(Colors.red)
        .setTitle('🪙 Duel Coinflip — Refusé')
        .setDescription(`<@${duel.challenged_id}> a refusé le duel. Mise remboursée à <@${duel.challenger_id}>.`);
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    // Accept
    const challenged = await getUser(duel.challenged_id, duel.guild_id);
    if (challenged.balance < duel.bet) {
      await addBalance(duel.challenger_id, duel.guild_id, duel.bet);
      await deleteDuel(duelId);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ <@${duel.challenged_id}> n'a pas assez de pièces ! Duel annulé.`)],
        components: [],
      });
    }

    await addBalance(duel.challenged_id, duel.guild_id, -duel.bet);
    await deleteDuel(duelId);

    const coin = Math.random() < 0.5 ? 'pile' : 'face';
    const winnerIsChallenger = coin === 'pile';
    const winnerId = winnerIsChallenger ? duel.challenger_id : duel.challenged_id;
    const loserId = winnerIsChallenger ? duel.challenged_id : duel.challenger_id;

    await addBalance(winnerId, duel.guild_id, duel.bet * 2);
    await addWin(winnerId, duel.guild_id);
    await addLoss(loserId, duel.guild_id);

    const embed = new EmbedBuilder()
      .setColor(Colors.gold)
      .setTitle('🪙 Duel Coinflip — Résultat !')
      .setDescription(
        `La pièce tombe sur **${coin === 'pile' ? '🪙 Pile' : '💿 Face'}** !\n\n` +
        `🏆 Vainqueur : <@${winnerId}>\n` +
        `💀 Perdant : <@${loserId}>\n\n` +
        `<@${winnerId}> remporte ${formatBalance(duel.bet * 2)} !`,
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
  },
};
