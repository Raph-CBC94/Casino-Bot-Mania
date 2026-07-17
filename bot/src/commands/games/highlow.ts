import {
  ActionRowBuilder, ButtonBuilder, ButtonInteraction,
  ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder,
} from 'discord.js';
import { getUser, addBalance, addWin, addLoss, getActiveEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

// ── Cartes ────────────────────────────────────────────────────────────────────
const RANKS  = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const VALUES = [  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13, 14];
const SUITS  = ['♠','♥','♦','♣'];
const SUIT_COLOR: Record<string, string> = { '♠': 'noire', '♣': 'noire', '♥': 'rouge', '♦': 'rouge' };

interface HLCard { rank: string; value: number; suit: string }
interface HLGame { card: HLCard; bet: number; userId: string; guildId: string }

const games = new Map<string, HLGame>();

function drawCard(): HLCard {
  const i = Math.floor(Math.random() * 13);
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { rank: RANKS[i], value: VALUES[i], suit };
}

function cardDisplay(card: HLCard): string {
  return `\`${card.rank}${card.suit}\``;
}

function cardEmoji(card: HLCard): string {
  return ['♥','♦'].includes(card.suit) ? '🔴' : '⚫';
}

function buildGameEmbed(card: HLCard, bet: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.cyan)
    .setTitle('🃏 High / Low')
    .setDescription(
      `## ${cardEmoji(card)} ${cardDisplay(card)}\n` +
      `Carte **${card.rank}** de couleur **${SUIT_COLOR[card.suit]}**\n\n` +
      `La prochaine carte sera-t-elle **plus haute** ou **plus basse** ?`,
    )
    .addFields({ name: '💰 Mise', value: formatBalance(bet), inline: true })
    .setFooter({ text: 'Égalité = remboursement • Gain ×1.9' });
}

function buildRow(gameId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`hl:higher:${gameId}`).setLabel('📈 Plus Haut').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`hl:lower:${gameId}`).setLabel('📉 Plus Bas').setStyle(ButtonStyle.Danger),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('highlow')
    .setDescription('🃏 Plus haut ou plus bas ? Double ta mise !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;
    const gameId = `${userId}:${guildId}`;

    if (games.has(gameId)) {
      return interaction.reply({ content: '⚠️ Tu as déjà une partie en cours !', ephemeral: true });
    }

    const user = await getUser(userId, guildId);
    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant — tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    const card = drawCard();
    games.set(gameId, { card, bet, userId, guildId });

    await interaction.reply({ embeds: [buildGameEmbed(card, bet)], components: [buildRow(gameId)] });

    // Auto-expiry 3 min
    setTimeout(() => games.delete(gameId), 180_000);
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, action, gameId] = interaction.customId.split(':');
    const game = games.get(gameId);

    if (!game) {
      return interaction.reply({ content: '⌛ Partie expirée — relance `/highlow`.', ephemeral: true });
    }
    if (interaction.user.id !== game.userId) {
      return interaction.reply({ content: '❌ Ce n\'est pas ta partie !', ephemeral: true });
    }

    games.delete(gameId);
    await interaction.deferUpdate();

    const nextCard = drawCard();
    const prevValue = game.card.value;
    const nextValue = nextCard.value;

    let result: 'win' | 'loss' | 'push';
    if (nextValue === prevValue) result = 'push';
    else if (action === 'higher') result = nextValue > prevValue ? 'win' : 'loss';
    else result = nextValue < prevValue ? 'win' : 'loss';

    const user = await getUser(game.userId, game.guildId);
    let gain = 0;
    let color: number = Colors.blue;
    let title = '';

    if (result === 'win') {
      const luckEffect = await getActiveEffect(game.userId, game.guildId, 'luck');
      const luckMult = luckEffect ? Number(luckEffect.value) : 1;
      gain = Math.floor(game.bet * 0.9 * luckMult);
      color = Colors.green;
      title = luckEffect ? `✅ Gagné ! ×${(0.9 * luckMult).toFixed(2)} 🍀` : '✅ Gagné ! ×1.9';
      await addWin(game.userId, game.guildId);
    } else if (result === 'loss') {
      gain = -game.bet;
      color = Colors.red;
      title = '❌ Perdu !';
      await addLoss(game.userId, game.guildId);
    } else {
      title = '🤝 Égalité — Mise remboursée';
    }

    await addBalance(game.userId, game.guildId, gain);
    const newBalance = user.balance + gain;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🃏 High / Low — ${title}`)
      .setDescription(
        `Carte précédente : ${cardEmoji(game.card)} ${cardDisplay(game.card)} **(${game.card.value})**\n` +
        `Carte suivante :     ${cardEmoji(nextCard)} ${cardDisplay(nextCard)} **(${nextCard.value})**\n\n` +
        `Tu as choisi **${action === 'higher' ? '📈 Plus Haut' : '📉 Plus Bas'}**`,
      )
      .addFields(
        { name: '💰 Mise',                                      value: formatBalance(game.bet),         inline: true },
        { name: result === 'win' ? '🤑 Gain' : result === 'loss' ? '📉 Perte' : '↩️ Remboursé',
          value: formatBalance(Math.abs(gain)),                                                          inline: true },
        { name: '🏦 Solde',                                     value: formatBalance(newBalance),       inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
  },
};
