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
import { formatBalance, generateDuelId, randomInt } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('duel-dice')
    .setDescription('🎲 Défie un joueur aux dés — le plus haut gagne !')
    .addUserOption(o => o.setName('adversaire').setDescription('Ton adversaire').setRequired(true))
    .addIntegerOption(o => o.setName('mise').setDescription('Montant misé par chacun').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('adversaire', true);
    const bet = interaction.options.getInteger('mise', true);

    if (target.bot || target.id === interaction.user.id)
      return interaction.reply({ content: '❌ Adversaire invalide.', ephemeral: true });

    const challenger = getUser(interaction.user.id, interaction.guildId!);
    if (challenger.balance < bet)
      return interaction.reply({ content: `❌ Solde insuffisant ! Tu as ${formatBalance(challenger.balance)}.`, ephemeral: true });

    const duelId = generateDuelId();
    addBalance(interaction.user.id, interaction.guildId!, -bet);
    createDuel(duelId, interaction.user.id, target.id, interaction.guildId!, interaction.channelId, 'dice', bet);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`duel_dice:accept:${duelId}`).setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`duel_dice:decline:${duelId}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor(Colors.cyan)
      .setTitle('🎲 Duel Dés')
      .setDescription(`<@${interaction.user.id}> défie <@${target.id}> aux **Dés** !\n\nMise : ${formatBalance(bet)} chacun\nPot total : ${formatBalance(bet * 2)}\n\n<@${target.id}> tu as 5 minutes pour accepter !`)
      .setFooter({ text: 'Le plus haut résultat gagne • Égalité = re-lancé !' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, action, duelId] = interaction.customId.split(':');
    const duel = getDuel(duelId);

    if (!duel) return interaction.reply({ content: '⌛ Ce duel a expiré.', ephemeral: true });
    if (interaction.user.id !== duel.challenged_id)
      return interaction.reply({ content: '❌ Ce duel ne te concerne pas !', ephemeral: true });
    if (duel.status !== 'pending')
      return interaction.reply({ content: '⌛ Ce duel est déjà terminé.', ephemeral: true });

    await interaction.deferUpdate();

    if (action === 'decline') {
      addBalance(duel.challenger_id, duel.guild_id, duel.bet);
      deleteDuel(duelId);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setTitle('🎲 Duel Dés — Refusé')
          .setDescription(`<@${duel.challenged_id}> a refusé le duel. Mise remboursée.`)],
        components: [],
      });
    }

    const challenged = getUser(duel.challenged_id, duel.guild_id);
    if (challenged.balance < duel.bet) {
      addBalance(duel.challenger_id, duel.guild_id, duel.bet);
      deleteDuel(duelId);
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ <@${duel.challenged_id}> n'a pas assez de pièces !`)],
        components: [],
      });
    }

    addBalance(duel.challenged_id, duel.guild_id, -duel.bet);
    deleteDuel(duelId);

    const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    let cRoll = randomInt(1, 6);
    let dRoll = randomInt(1, 6);
    let rerolls = 0;
    while (cRoll === dRoll && rerolls < 5) { cRoll = randomInt(1, 6); dRoll = randomInt(1, 6); rerolls++; }

    const tie = cRoll === dRoll;
    let winnerId: string, loserId: string;
    if (tie) {
      winnerId = ''; loserId = '';
    } else if (cRoll > dRoll) {
      winnerId = duel.challenger_id; loserId = duel.challenged_id;
    } else {
      winnerId = duel.challenged_id; loserId = duel.challenger_id;
    }

    if (!tie) {
      addBalance(winnerId, duel.guild_id, duel.bet * 2);
      addWin(winnerId, duel.guild_id);
      addLoss(loserId, duel.guild_id);
    } else {
      addBalance(duel.challenger_id, duel.guild_id, duel.bet);
      addBalance(duel.challenged_id, duel.guild_id, duel.bet);
    }

    const embed = new EmbedBuilder()
      .setColor(tie ? Colors.blue : Colors.gold)
      .setTitle('🎲 Duel Dés — Résultat !')
      .setDescription(
        `<@${duel.challenger_id}> : **${DICE_FACES[cRoll - 1]} ${cRoll}**\n` +
        `<@${duel.challenged_id}> : **${DICE_FACES[dRoll - 1]} ${dRoll}**\n\n` +
        (tie
          ? '🤝 Égalité ! Mises remboursées.'
          : `🏆 Vainqueur : <@${winnerId}> remporte ${formatBalance(duel.bet * 2)} !`),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
  },
};
