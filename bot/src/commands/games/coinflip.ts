import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, addWin, addLoss } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('🪙 Pile ou Face — double ou rien !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
    .addStringOption(o =>
      o.setName('choix').setDescription('Pile ou Face ?').setRequired(true)
        .addChoices({ name: '🪙 Pile', value: 'pile' }, { name: '💿 Face', value: 'face' })),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const choix = interaction.options.getString('choix', true);
    const user = getUser(interaction.user.id, interaction.guildId!);

    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    const result = Math.random() < 0.5 ? 'pile' : 'face';
    const won = result === choix;

    addBalance(interaction.user.id, interaction.guildId!, won ? bet : -bet);
    won ? addWin(interaction.user.id, interaction.guildId!) : addLoss(interaction.user.id, interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(won ? Colors.green : Colors.red)
      .setTitle(`🪙 Coinflip — ${won ? 'GAGNÉ !' : 'PERDU !'}`)
      .setDescription(
        `Tu as joué **${choix === 'pile' ? '🪙 Pile' : '💿 Face'}**\n` +
        `La pièce est tombée sur **${result === 'pile' ? '🪙 Pile' : '💿 Face'}**\n\n` +
        `${won ? '🎉 Tu doubles ta mise !' : '😭 Tu perds ta mise !'}`,
      )
      .addFields(
        { name: '💰 Mise', value: formatBalance(bet), inline: true },
        { name: won ? '🤑 Gain' : '📉 Perte', value: formatBalance(bet), inline: true },
        { name: '🏦 Solde', value: formatBalance(user.balance + (won ? bet : -bet)), inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
