import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getUser, addBalance, addWin, addLoss } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🎯', '💎', '7️⃣'];
const WEIGHTS  = [30,   25,   20,   12,   8,    3,    2   ];
const PAYOUTS: Record<string, number> = {
  '7️⃣': 50, '💎': 30, '🎯': 20,
  '🍇': 10,  '🍊': 8,  '🍋': 5, '🍒': 3,
};

function weightedRandom(): string {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function spinReel(): string[] {
  return [weightedRandom(), weightedRandom(), weightedRandom()];
}

function computePayout(reel: string[], bet: number): { multiplier: number; label: string } {
  const [a, b, c] = reel;
  if (a === b && b === c) {
    const m = PAYOUTS[a] ?? 3;
    return { multiplier: m, label: `Jackpot triple ${a} !` };
  }
  if (a === b || b === c || a === c) {
    return { multiplier: 1.5, label: 'Deux identiques !' };
  }
  return { multiplier: 0, label: 'Aucune combinaison...' };
}

export default {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('🎰 Tente ta chance à la machine à sous !')
    .addIntegerOption(o =>
      o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const user = getUser(interaction.user.id, interaction.guildId!);
    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${formatBalance(user.balance)} mais tu misais ${formatBalance(bet)}.`)],
        ephemeral: true,
      });
    }

    const reel = spinReel();
    const { multiplier, label } = computePayout(reel, bet);
    const gain = Math.floor(bet * multiplier) - bet;

    addBalance(interaction.user.id, interaction.guildId!, gain);
    if (gain >= 0) addWin(interaction.user.id, interaction.guildId!);
    else addLoss(interaction.user.id, interaction.guildId!);

    const newBalance = user.balance + gain;
    const won = gain > 0;
    const push = gain === 0;

    const reelStr = `╔══════════════╗\n║ ${reel.join('  ')} ║\n╚══════════════╝`;

    const embed = new EmbedBuilder()
      .setColor(won ? Colors.gold : push ? Colors.blue : Colors.red)
      .setTitle('🎰 Machine à Sous')
      .setDescription(`${reelStr}\n\n${won ? '✨' : push ? '🔄' : '💀'} **${label}**`)
      .addFields(
        { name: '💰 Mise',        value: formatBalance(bet),        inline: true },
        { name: won ? '🤑 Gain' : '📉 Perte', value: formatBalance(Math.abs(gain)), inline: true },
        { name: '🏦 Solde',      value: formatBalance(newBalance), inline: true },
      )
      .setFooter({ text: multiplier === 0 ? 'Retente ta chance !' : `Multiplicateur ×${multiplier}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
