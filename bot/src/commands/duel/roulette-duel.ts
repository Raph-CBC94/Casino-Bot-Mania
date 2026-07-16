import {
  ActionRowBuilder, ButtonBuilder, ButtonInteraction,
  ButtonStyle, ChatInputCommandInteraction, EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import {
  createDuel, deleteDuel, getDuel, getUser,
  addBalance, addWin, addLoss, updateDuelData,
} from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance, generateDuelId, randomInt } from '../../utils/economy.js';

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export default {
  data: new SlashCommandBuilder()
    .setName('duel-roulette')
    .setDescription('🎡 Défie un joueur à la Roulette — choisis ta couleur !')
    .addUserOption(o => o.setName('adversaire').setDescription('Ton adversaire').setRequired(true))
    .addIntegerOption(o => o.setName('mise').setDescription('Montant misé par chacun').setRequired(true).setMinValue(10))
    .addStringOption(o =>
      o.setName('couleur').setDescription('Ta couleur').setRequired(true)
        .addChoices({ name: '🔴 Rouge', value: 'rouge' }, { name: '⚫ Noir', value: 'noir' })),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('adversaire', true);
    const bet = interaction.options.getInteger('mise', true);
    const color = interaction.options.getString('couleur', true);

    if (target.bot || target.id === interaction.user.id)
      return interaction.reply({ content: '❌ Adversaire invalide.', ephemeral: true });

    const challenger = await getUser(interaction.user.id, interaction.guildId!);
    if (challenger.balance < bet)
      return interaction.reply({ content: `❌ Solde insuffisant ! Tu as ${formatBalance(challenger.balance)}.`, ephemeral: true });

    const duelId = generateDuelId();
    await addBalance(interaction.user.id, interaction.guildId!, -bet);
    await createDuel(duelId, interaction.user.id, target.id, interaction.guildId!, interaction.channelId, 'roulette', bet);
    await updateDuelData(duelId, { challengerColor: color });

    const oppositeColor = color === 'rouge' ? 'noir' : 'rouge';
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`duel_roulette:accept:${duelId}`).setLabel(`✅ Accepter (${oppositeColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'})`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`duel_roulette:decline:${duelId}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(Colors.purple)
      .setTitle('🎡 Duel Roulette')
      .setDescription(
        `<@${interaction.user.id}> défie <@${target.id}> à la **Roulette** !\n\n` +
        `<@${interaction.user.id}> joue **${color === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n` +
        `<@${target.id}> jouera **${oppositeColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n\n` +
        `Mise : ${formatBalance(bet)} chacun\nPot : ${formatBalance(bet * 2)}\n\n` +
        `⚠️ Si **🟢 0** sort, les deux perdent !`,
      )
      .setFooter({ text: 'Tu as 5 minutes pour répondre' })
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
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setTitle('🎡 Duel Roulette — Refusé')
          .setDescription(`<@${duel.challenged_id}> a refusé. Mise remboursée.`)],
        components: [],
      });
    }

    const challenged = await getUser(duel.challenged_id, duel.guild_id);
    if (challenged.balance < duel.bet) {
      await addBalance(duel.challenger_id, duel.guild_id, duel.bet);
      await deleteDuel(duelId);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ <@${duel.challenged_id}> n'a pas assez de pièces !`)],
        components: [],
      });
    }

    await addBalance(duel.challenged_id, duel.guild_id, -duel.bet);
    const data = JSON.parse(duel.data) as { challengerColor: string };
    const challengerColor = data.challengerColor;
    const challengedColor = challengerColor === 'rouge' ? 'noir' : 'rouge';
    await deleteDuel(duelId);

    const spin = randomInt(0, 36);
    const isRed = spin > 0 && RED_NUMBERS.has(spin);
    const spinColor = spin === 0 ? null : isRed ? 'rouge' : 'noir';
    const colorEmoji = spin === 0 ? '🟢' : isRed ? '🔴' : '⚫';

    let embed: EmbedBuilder;
    if (spinColor === null) {
      embed = new EmbedBuilder().setColor(Colors.green).setTitle('🎡 Duel Roulette — 0 ! House Wins')
        .setDescription(`La bille s'arrête sur **🟢 0** !\nLes deux joueurs perdent leur mise.\nLe casino s'enrichit 😈`).setTimestamp();
    } else {
      const challengerWon = spinColor === challengerColor;
      const winnerId = challengerWon ? duel.challenger_id : duel.challenged_id;
      const loserId = challengerWon ? duel.challenged_id : duel.challenger_id;
      await addBalance(winnerId, duel.guild_id, duel.bet * 2);
      await addWin(winnerId, duel.guild_id);
      await addLoss(loserId, duel.guild_id);

      embed = new EmbedBuilder()
        .setColor(Colors.gold)
        .setTitle('🎡 Duel Roulette — Résultat !')
        .setDescription(
          `La bille s'arrête sur **${colorEmoji} ${spin}**\n\n` +
          `<@${duel.challenger_id}> jouait **${challengerColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n` +
          `<@${duel.challenged_id}> jouait **${challengedColor === 'rouge' ? '🔴 Rouge' : '⚫ Noir'}**\n\n` +
          `🏆 Vainqueur : <@${winnerId}> remporte ${formatBalance(duel.bet * 2)} !`,
        ).setTimestamp();
    }

    await interaction.editReply({ embeds: [embed], components: [] });
  },
};
