import {
  ActionRowBuilder, ButtonBuilder, ButtonInteraction,
  ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder,
} from 'discord.js';
import { getUser, addBalance, addWin, addLoss, getActiveEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

interface CrashGame {
  userId: string;
  guildId: string;
  bet: number;
  mult: number;
  crashAt: number;
  cashedOut: boolean;
  interval: ReturnType<typeof setInterval> | null;
}

const games = new Map<string, CrashGame>();
const interactions = new Map<string, ChatInputCommandInteraction>();

function generateCrashPoint(): number {
  // Distribution pondérée : beaucoup de crashes bas, rares crashes hauts
  const r = Math.random();
  if (r < 0.01) return 1.00;                                       // 1% crash instantané
  return Math.max(1.05, parseFloat((0.99 / (1 - r * 0.98)).toFixed(2)));
}

function multBar(mult: number, crashAt: number): string {
  const danger = mult / crashAt;
  const filled = Math.min(10, Math.round(danger * 10));
  const bar = '🟥'.repeat(filled) + '⬛'.repeat(10 - filled);
  return bar;
}

function buildEmbed(game: CrashGame, status: 'running' | 'won' | 'lost'): EmbedBuilder {
  const currentValue = Math.floor(game.bet * game.mult);
  const profit = currentValue - game.bet;

  if (status === 'running') {
    return new EmbedBuilder()
      .setColor(game.mult < 2 ? Colors.green : game.mult < 5 ? Colors.orange : Colors.red)
      .setTitle('🚀 Crash — En vol !')
      .setDescription(
        `## ×${game.mult.toFixed(2)}\n` +
        `${multBar(game.mult, game.crashAt)}\n\n` +
        `⚠️ *Le crash peut arriver à tout moment...*`,
      )
      .addFields(
        { name: '💰 Mise',           value: formatBalance(game.bet),      inline: true },
        { name: '📈 Valeur actuelle', value: formatBalance(currentValue),  inline: true },
        { name: '💵 Profit',         value: `+${formatBalance(profit)}`,   inline: true },
      )
      .setFooter({ text: 'Clique Cash Out avant le crash !' });
  }

  if (status === 'won') {
    return new EmbedBuilder()
      .setColor(Colors.green)
      .setTitle(`🚀 Crash — Cash Out réussi ! ×${game.mult.toFixed(2)}`)
      .setDescription(`✅ Tu t'es retiré à temps et empoches **${formatBalance(profit)}** de profit !`)
      .addFields(
        { name: '💰 Mise',   value: formatBalance(game.bet),     inline: true },
        { name: '🤑 Gain',   value: formatBalance(profit),       inline: true },
        { name: '🏦 Solde',  value: formatBalance(currentValue), inline: true },
      )
      .setTimestamp();
  }

  // lost
  return new EmbedBuilder()
    .setColor(Colors.red)
    .setTitle(`💥 CRASH à ×${game.mult.toFixed(2)} !`)
    .setDescription(`❌ La fusée s'est écrasée... Tu perds ta mise de ${formatBalance(game.bet)}.`)
    .addFields({ name: '📉 Perte', value: formatBalance(game.bet), inline: true })
    .setTimestamp();
}

function buildRow(gameId: string, mult: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`crash:cashout:${gameId}`)
      .setLabel(`💰 Cash Out  ×${mult.toFixed(2)}`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
  );
}

async function endCrash(gameId: string, game: CrashGame, status: 'won' | 'lost'): Promise<void> {
  if (game.interval) clearInterval(game.interval);
  games.delete(gameId);
  const interaction = interactions.get(gameId);
  interactions.delete(gameId);
  if (!interaction) return;

  const user = await getUser(game.userId, game.guildId);
  let gain: number;

  if (status === 'won') {
    const luckEffect = await getActiveEffect(game.userId, game.guildId, 'luck');
    const luckMult = luckEffect ? Number(luckEffect.value) : 1;
    const totalMult = game.mult * luckMult;
    gain = Math.floor(game.bet * totalMult) - game.bet;
    await addBalance(game.userId, game.guildId, gain);
    await addWin(game.userId, game.guildId);
    // Rebuild embed with correct balance
    const embed = buildEmbed(game, 'won')
      .spliceFields(2, 1, { name: '🏦 Nouveau solde', value: formatBalance(user.balance + gain), inline: true });
    await interaction.editReply({ embeds: [embed], components: [buildRow(gameId, game.mult, true)] });
  } else {
    await addLoss(game.userId, game.guildId);
    const embed = buildEmbed(game, 'lost')
      .addFields({ name: '🏦 Nouveau solde', value: formatBalance(user.balance - game.bet), inline: true });
    await interaction.editReply({ embeds: [embed], components: [buildRow(gameId, game.mult, true)] });
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('🚀 Mise sur le multiplicateur — cash out avant le crash !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;
    const gameId = `${userId}:${guildId}`;

    if (games.has(gameId)) {
      return interaction.reply({ content: '⚠️ Tu as déjà une partie crash en cours !', ephemeral: true });
    }

    const user = await getUser(userId, guildId);
    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant — tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    await addBalance(userId, guildId, -bet);

    const crashAt = generateCrashPoint();
    const game: CrashGame = { userId, guildId, bet, mult: 1.00, crashAt, cashedOut: false, interval: null };
    games.set(gameId, game);
    interactions.set(gameId, interaction);

    await interaction.reply({ embeds: [buildEmbed(game, 'running')], components: [buildRow(gameId, 1.00)] });

    // Tick toutes les 1.5s — fait croître le multiplicateur
    game.interval = setInterval(async () => {
      if (game.cashedOut) return;
      // Croissance 5-13% par tick
      game.mult = parseFloat((game.mult * (1.05 + Math.random() * 0.08)).toFixed(2));

      if (game.mult >= game.crashAt) {
        game.mult = game.crashAt;
        await endCrash(gameId, game, 'lost');
        return;
      }

      try {
        await interaction.editReply({
          embeds: [buildEmbed(game, 'running')],
          components: [buildRow(gameId, game.mult)],
        });
      } catch { /* interaction expirée */ }
    }, 1500);

    // Timeout sécurité 3 min
    setTimeout(() => {
      if (games.has(gameId)) endCrash(gameId, game, 'lost').catch(() => null);
    }, 180_000);
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, action, gameId] = interaction.customId.split(':');
    if (action !== 'cashout') return;

    const game = games.get(gameId);
    if (!game) {
      return interaction.reply({ content: '⌛ Partie expirée.', ephemeral: true });
    }
    if (interaction.user.id !== game.userId) {
      return interaction.reply({ content: '❌ Ce n\'est pas ta partie !', ephemeral: true });
    }

    game.cashedOut = true;
    await interaction.deferUpdate();
    await endCrash(gameId, game, 'won');
  },
};
