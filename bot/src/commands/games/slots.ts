import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, addWin, addLoss, getActiveEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🎯', '💎', '7️⃣'];
const WEIGHTS  = [30,   25,   20,   12,   8,    3,    2   ];
const PAYOUTS: Record<string, number> = {
  '7️⃣': 50, '💎': 30, '🎯': 20,
  '🍇': 10,  '🍊': 8,  '🍋': 5, '🍒': 3,
};
const RARITY: Record<string, string> = {
  '7️⃣': '👑 LÉGENDAIRE', '💎': '💫 ÉPIQUE', '🎯': '⭐ RARE',
  '🍇': 'JACKPOT',        '🍊': 'JACKPOT',   '🍋': 'JACKPOT', '🍒': 'JACKPOT',
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

function spin(): string[] { return [weightedRandom(), weightedRandom(), weightedRandom()]; }

function computePayout(reel: string[]): { multiplier: number; label: string; isJackpot: boolean } {
  const [a, b, c] = reel;
  if (a === b && b === c) {
    return { multiplier: PAYOUTS[a] ?? 3, label: `${RARITY[a] ?? 'JACKPOT'} Triple ${a}`, isJackpot: true };
  }
  if (a === b || b === c || a === c) {
    return { multiplier: 1.5, label: 'Paire 🎊', isJackpot: false };
  }
  return { multiplier: 0, label: 'Aucune combinaison', isJackpot: false };
}

export default {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('🎰 Tente ta chance à la machine à sous !')
    .addIntegerOption(o =>
      o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet     = interaction.options.getInteger('mise', true);
    const userId  = interaction.user.id;
    const guildId = interaction.guildId!;
    const user    = await getUser(userId, guildId);

    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red)
          .setDescription(`❌ Solde insuffisant — tu as ${formatBalance(user.balance)} mais tu misais ${formatBalance(bet)}.`)],
        ephemeral: true,
      });
    }

    const reel = spin();
    const { multiplier, label, isJackpot } = computePayout(reel);

    // Applique l'effet Luck
    const luckEffect = await getActiveEffect(userId, guildId, 'luck');
    const luckMult   = (luckEffect && multiplier > 0) ? Number(luckEffect.value) : 1;
    const effectiveMult = multiplier * luckMult;

    const gain = multiplier > 0 ? Math.floor(bet * effectiveMult) - bet : -bet;
    await addBalance(userId, guildId, gain);
    if (gain >= 0) await addWin(userId, guildId);
    else           await addLoss(userId, guildId);

    const newBalance = user.balance + gain;
    const won  = gain > 0;
    const push = gain === 0;

    // Affichage des rouleaux
    const reelLine = `┃ ${reel.join('  ')} ┃`;
    const border   = '┗━━━━━━━━━━━━━━━┛';
    const top      = '┏━━━━━━━━━━━━━━━┓';

    const embed = new EmbedBuilder()
      .setColor(isJackpot ? Colors.gold : won ? Colors.green : push ? Colors.blue : Colors.red)
      .setTitle(`🎰 Machine à Sous${isJackpot ? ' — 🎉 JACKPOT !' : ''}`)
      .setDescription(
        `\`\`\`\n${top}\n${reelLine}\n${border}\`\`\`` +
        `\n${won ? '✨' : push ? '🔄' : '💀'} **${label}**` +
        (luckEffect && won ? `\n🍀 *Trèfle Doré actif — ×${luckMult} appliqué !*` : ''),
      )
      .addFields(
        { name: '💰 Mise',                                         value: formatBalance(bet),              inline: true },
        { name: won ? '🤑 Gain' : push ? '↩️ Remboursé' : '📉 Perte', value: formatBalance(Math.abs(gain)),  inline: true },
        { name: '🏦 Solde',                                        value: formatBalance(newBalance),       inline: true },
      )
      .setFooter({ text: multiplier === 0 ? 'Retente ta chance !' : `Multiplicateur ×${effectiveMult.toFixed(1)}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
