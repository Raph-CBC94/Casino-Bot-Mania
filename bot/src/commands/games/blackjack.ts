import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { getUser, addBalance, addWin, addLoss } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Card { val: number; str: string }
interface BJGame {
  player: Card[];
  dealer: Card[];
  bet: number;
  userId: string;
  guildId: string;
  doubled: boolean;
  startTime: number;
}

const games = new Map<string, BJGame>();
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

function drawCard(): Card {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const val = rank === 'A' ? 11 : ['J','Q','K'].includes(rank) ? 10 : parseInt(rank);
  return { val, str: `${rank}${suit}` };
}

function handValue(cards: Card[]): number {
  let total = cards.reduce((s, c) => s + c.val, 0);
  let aces = cards.filter(c => c.str.startsWith('A')).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function handStr(cards: Card[]): string {
  return cards.map(c => `\`${c.str}\``).join(' ');
}

function buildButtons(gameId: string, canDouble: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bj:hit:${gameId}`).setLabel('Tirer 🃏').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj:stand:${gameId}`).setLabel('Rester ✋').setStyle(ButtonStyle.Secondary),
    ...(canDouble ? [new ButtonBuilder().setCustomId(`bj:double:${gameId}`).setLabel('Double ×2 💰').setStyle(ButtonStyle.Danger)] : []),
  );
}

function buildEmbed(game: BJGame, hideDealer = true): EmbedBuilder {
  const pv = handValue(game.player);
  const dv = hideDealer ? game.dealer[0].val : handValue(game.dealer);
  const dealerDisplay = hideDealer
    ? `${handStr([game.dealer[0]])} \`??\``
    : handStr(game.dealer);

  return new EmbedBuilder()
    .setColor(Colors.dark)
    .setTitle('🃏 Blackjack')
    .addFields(
      { name: `Dealer (${hideDealer ? '?' : dv})`, value: dealerDisplay, inline: false },
      { name: `Toi (${pv})`, value: handStr(game.player), inline: false },
      { name: '💰 Mise', value: formatBalance(game.bet), inline: true },
    );
}

async function endGame(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  game: BJGame,
  gameId: string,
  outcome: 'win' | 'loss' | 'push' | 'blackjack',
) {
  games.delete(gameId);
  const user = await getUser(game.userId, game.guildId);
  let gain = 0;
  let resultText = '';
  let color: number = Colors.blue;

  if (outcome === 'blackjack') {
    gain = Math.floor(game.bet * 1.5);
    resultText = '🌟 BLACKJACK ! Tu gagnes ×2.5 !';
    color = Colors.gold;
    await addWin(game.userId, game.guildId);
  } else if (outcome === 'win') {
    gain = game.bet;
    resultText = '✅ Tu gagnes !';
    color = Colors.green;
    await addWin(game.userId, game.guildId);
  } else if (outcome === 'loss') {
    gain = -game.bet;
    resultText = '❌ Tu perds !';
    color = Colors.red;
    await addLoss(game.userId, game.guildId);
  } else {
    resultText = '🤝 Égalité — mise remboursée';
    color = Colors.blue;
  }

  await addBalance(game.userId, game.guildId, gain);
  const newBalance = user.balance + gain;

  const embed = buildEmbed(game, false)
    .setColor(color)
    .setTitle(`🃏 Blackjack — ${resultText}`)
    .addFields(
      { name: gain >= 0 ? '🤑 Gain' : '📉 Perte', value: formatBalance(Math.abs(gain)), inline: true },
      { name: '🏦 Solde', value: formatBalance(newBalance), inline: true },
    )
    .setTimestamp();

  if (interaction.deferred || interaction.replied) {
    await (interaction as ButtonInteraction).editReply({ embeds: [embed], components: [] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('🃏 Joue au Blackjack contre le dealer !')
    .addIntegerOption(o =>
      o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10)),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getInteger('mise', true);
    const user = await getUser(interaction.user.id, interaction.guildId!);
    const gameId = `${interaction.user.id}:${interaction.guildId}`;

    if (games.has(gameId)) {
      return interaction.reply({ content: '⚠️ Tu as déjà une partie en cours !', ephemeral: true });
    }
    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant ! Tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    await addBalance(interaction.user.id, interaction.guildId!, -bet);

    const player = [drawCard(), drawCard()];
    const dealer = [drawCard(), drawCard()];
    const game: BJGame = { player, dealer, bet, userId: interaction.user.id, guildId: interaction.guildId!, doubled: false, startTime: Date.now() };
    games.set(gameId, game);

    // Blackjack immédiat
    if (handValue(player) === 21) {
      await addBalance(interaction.user.id, interaction.guildId!, bet); // refund
      return endGame(interaction, game, gameId, 'blackjack');
    }

    const embed = buildEmbed(game);
    const row = buildButtons(gameId, user.balance - bet >= bet);
    await interaction.reply({ embeds: [embed], components: [row] });

    // Auto-clean après 5 min
    setTimeout(async () => {
      if (games.has(gameId)) {
        games.delete(gameId);
        await addLoss(interaction.user.id, interaction.guildId!);
      }
    }, 300_000);
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, action, gameId] = interaction.customId.split(':');
    const game = games.get(gameId);

    if (!game) {
      return interaction.reply({ content: '⌛ Partie expirée, relance /blackjack.', ephemeral: true });
    }
    if (interaction.user.id !== game.userId) {
      return interaction.reply({ content: '❌ Ce n\'est pas ta partie !', ephemeral: true });
    }

    await interaction.deferUpdate();

    if (action === 'hit' || action === 'double') {
      if (action === 'double') {
        const currentUser = await getUser(game.userId, game.guildId);
        if (currentUser.balance < game.bet) {
          await interaction.followUp({ content: '❌ Solde insuffisant pour doubler !', ephemeral: true });
          return;
        }
        await addBalance(game.userId, game.guildId, -game.bet);
        game.bet *= 2;
        game.doubled = true;
      }

      game.player.push(drawCard());
      const pv = handValue(game.player);

      if (pv > 21) return endGame(interaction, game, gameId, 'loss');
      if (pv === 21 || game.doubled) {
        return handleStand(interaction, game, gameId);
      }

      const embed = buildEmbed(game);
      const row = buildButtons(gameId, false);
      await interaction.editReply({ embeds: [embed], components: [row] });
    } else if (action === 'stand') {
      await handleStand(interaction, game, gameId);
    }
  },
};

async function handleStand(
  interaction: ButtonInteraction,
  game: BJGame,
  gameId: string,
) {
  while (handValue(game.dealer) < 17) game.dealer.push(drawCard());

  const pv = handValue(game.player);
  const dv = handValue(game.dealer);

  let outcome: 'win' | 'loss' | 'push';
  if (dv > 21 || pv > dv) outcome = 'win';
  else if (dv > pv) outcome = 'loss';
  else outcome = 'push';

  await endGame(interaction, game, gameId, outcome);
}
