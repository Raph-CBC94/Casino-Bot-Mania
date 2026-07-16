import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, addWin, addLoss } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance, randomInt } from '../../utils/economy.js';

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

interface BetType {
  label: string;
  multiplier: number;
  check: (n: number) => boolean;
}

const BET_TYPES: Record<string, BetType> = {
  rouge:      { label: '🔴 Rouge',        multiplier: 2, check: n => n > 0 && RED_NUMBERS.has(n) },
  noir:       { label: '⚫ Noir',          multiplier: 2, check: n => n > 0 && !RED_NUMBERS.has(n) },
  pair:       { label: '2️⃣ Pair',         multiplier: 2, check: n => n > 0 && n % 2 === 0 },
  impair:     { label: '1️⃣ Impair',       multiplier: 2, check: n => n % 2 === 1 },
  manque:     { label: '📉 Manque (1-18)', multiplier: 2, check: n => n >= 1 && n <= 18 },
  passe:      { label: '📈 Passe (19-36)', multiplier: 2, check: n => n >= 19 && n <= 36 },
  douzaine_1: { label: '🔢 1ère douzaine (1-12)',  multiplier: 3, check: n => n >= 1 && n <= 12 },
  douzaine_2: { label: '🔢 2ème douzaine (13-24)', multiplier: 3, check: n => n >= 13 && n <= 24 },
  douzaine_3: { label: '🔢 3ème douzaine (25-36)', multiplier: 3, check: n => n >= 25 && n <= 36 },
};

export default {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('🎡 Mise sur la roulette européenne !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
    .addStringOption(o =>
      o.setName('type').setDescription('Type de mise').setRequired(true).addChoices(
        { name: '🔴 Rouge', value: 'rouge' },
        { name: '⚫ Noir', value: 'noir' },
        { name: '2️⃣ Pair', value: 'pair' },
        { name: '1️⃣ Impair', value: 'impair' },
        { name: '📉 Manque (1-18)', value: 'manque' },
        { name: '📈 Passe (19-36)', value: 'passe' },
        { name: '🔢 1ère Douzaine (1-12)', value: 'douzaine_1' },
        { name: '🔢 2ème Douzaine (13-24)', value: 'douzaine_2' },
        { name: '🔢 3ème Douzaine (25-36)', value: 'douzaine_3' },
        { name: '🎯 Numéro plein (×36)', value: 'numero' },
      ))
    .addIntegerOption(o =>
      o.setName('numero').setDescription('Ton numéro (0-36) — uniquement pour "Numéro plein"').setMinValue(0).setMaxValue(36)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const type = interaction.options.getString('type', true);
    const user = getUser(interaction.user.id, interaction.guildId!);

    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    const result = randomInt(0, 36);
    const isRed = result > 0 && RED_NUMBERS.has(result);
    const colorEmoji = result === 0 ? '🟢' : isRed ? '🔴' : '⚫';

    let won = false;
    let multiplier = 0;
    let betLabel = '';

    if (type === 'numero') {
      const num = interaction.options.getInteger('numero');
      if (num === null) {
        return interaction.reply({ content: '❌ Précise un numéro (0-36) pour le pari "Numéro plein" !', ephemeral: true });
      }
      won = result === num;
      multiplier = 36;
      betLabel = `🎯 Numéro ${num}`;
    } else {
      const bt = BET_TYPES[type];
      won = bt.check(result);
      multiplier = bt.multiplier;
      betLabel = bt.label;
    }

    const gain = won ? Math.floor(bet * multiplier) - bet : -bet;
    addBalance(interaction.user.id, interaction.guildId!, gain);
    won ? addWin(interaction.user.id, interaction.guildId!) : addLoss(interaction.user.id, interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(result === 0 ? Colors.green : isRed ? Colors.red : Colors.dark)
      .setTitle('🎡 Roulette')
      .setDescription(
        `La bille s'arrête sur : **${colorEmoji} ${result}**\n\n` +
        `Ton pari : **${betLabel}**\n` +
        `**${won ? '✅ Gagné !' : '❌ Perdu !'}**`,
      )
      .addFields(
        { name: '💰 Mise', value: formatBalance(bet), inline: true },
        { name: gain >= 0 ? '🤑 Gain' : '📉 Perte', value: formatBalance(Math.abs(gain)), inline: true },
        { name: '🏦 Solde', value: formatBalance(user.balance + gain), inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
