import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, addWin, addLoss } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance, randomInt } from '../../utils/economy.js';

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

export default {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('🎲 Devine le résultat du dé — ×5 si exact !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
    .addIntegerOption(o =>
      o.setName('chiffre').setDescription('Ton chiffre (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const guess = interaction.options.getInteger('chiffre', true);
    const user = getUser(interaction.user.id, interaction.guildId!);

    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    const roll = randomInt(1, 6);
    const diff = Math.abs(roll - guess);

    let multiplier = 0;
    let resultLabel = '';
    if (diff === 0) { multiplier = 5; resultLabel = '🎯 EXACT ! ×5 !'; }
    else if (diff === 1) { multiplier = 1.5; resultLabel = '👌 Presque ! ×1.5'; }
    else { resultLabel = '❌ Raté !'; }

    const gain = Math.floor(bet * multiplier) - bet;
    addBalance(interaction.user.id, interaction.guildId!, gain);
    gain >= 0 ? addWin(interaction.user.id, interaction.guildId!) : addLoss(interaction.user.id, interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(multiplier >= 1 ? Colors.green : Colors.red)
      .setTitle('🎲 Lancer de Dé')
      .setDescription(
        `Tu as joué : **${DICE_FACES[guess - 1]} ${guess}**\n` +
        `Résultat : **${DICE_FACES[roll - 1]} ${roll}**\n\n` +
        `**${resultLabel}**`,
      )
      .addFields(
        { name: '💰 Mise', value: formatBalance(bet), inline: true },
        { name: gain >= 0 ? '🤑 Gain' : '📉 Perte', value: formatBalance(Math.abs(gain)), inline: true },
        { name: '🏦 Solde', value: formatBalance(user.balance + gain), inline: true },
      )
      .setFooter({ text: 'Exact = ×5 • ±1 = ×1.5 • Autre = Perdu' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
