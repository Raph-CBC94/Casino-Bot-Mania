import {
  ActionRowBuilder, ButtonBuilder, ButtonInteraction,
  ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder,
} from 'discord.js';
import { getUser, addBalance, addWin, addLoss, getActiveEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

const TOTAL_TILES = 20; // 4 rangées × 5 colonnes

interface MinesGame {
  userId: string;
  guildId: string;
  bet: number;
  mineCount: number;
  mineSet: Set<number>;
  revealed: Set<number>;
  safeRevealed: number;
  currentMult: number;
  over: boolean;
}

const games = new Map<string, MinesGame>();

function placeMines(count: number): Set<number> {
  const mines = new Set<number>();
  while (mines.size < count) {
    mines.add(Math.floor(Math.random() * TOTAL_TILES));
  }
  return mines;
}

/** Multiplicateur après k révélations sécurisées (formule probabiliste, edge 3%) */
function nextMult(current: number, k: number, mines: number): number {
  const totalRemaining = TOTAL_TILES - k;
  const safeRemaining  = TOTAL_TILES - mines - k;
  if (safeRemaining <= 0) return current;
  return parseFloat((current * (totalRemaining / safeRemaining) * 0.97).toFixed(3));
}

function buildEmbed(game: MinesGame, status: 'playing' | 'won' | 'lost'): EmbedBuilder {
  const potential = Math.floor(game.bet * game.currentMult);
  const profit    = potential - game.bet;

  const base = new EmbedBuilder().addFields(
    { name: '💣 Mines',          value: `${game.mineCount}`,            inline: true },
    { name: '💎 Tuiles sûres',   value: `${game.safeRevealed}`,         inline: true },
    { name: '📈 Multiplicateur', value: `×${game.currentMult.toFixed(2)}`, inline: true },
    { name: '💰 Mise',           value: formatBalance(game.bet),         inline: true },
    { name: '💵 Valeur actuelle',value: formatBalance(potential),        inline: true },
    { name: '📊 Profit',         value: `+${formatBalance(profit)}`,     inline: true },
  );

  if (status === 'playing') {
    return base
      .setColor(Colors.purple)
      .setTitle('💣 Mines — Révèle des tuiles !')
      .setDescription('Clique sur les tuiles pour trouver des 💎. Évite les 💣 !')
      .setFooter({ text: 'Cash Out à tout moment pour sécuriser tes gains' });
  }
  if (status === 'won') {
    return base
      .setColor(Colors.green)
      .setTitle(`💣 Mines — Cash Out ×${game.currentMult.toFixed(2)} !`)
      .setDescription(`✅ Tu encaisses **${formatBalance(profit)}** de profit !`)
      .setTimestamp();
  }
  return base
    .setColor(Colors.red)
    .setTitle('💣 BOOM — Tu as touché une mine !')
    .setDescription(`❌ Tu perds ta mise de ${formatBalance(game.bet)}. Les mines sont révélées.`)
    .setTimestamp();
}

function buildGrid(game: MinesGame, gameId: string, showAll = false): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let row = 0; row < 4; row++) {
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    for (let col = 0; col < 5; col++) {
      const idx     = row * 5 + col;
      const isMine  = game.mineSet.has(idx);
      const isRevealed = game.revealed.has(idx);

      let emoji = '⬜';
      let style = ButtonStyle.Secondary;

      if (isRevealed) {
        emoji = isMine ? '💣' : '💎';
        style = isMine ? ButtonStyle.Danger : ButtonStyle.Success;
      } else if (showAll && isMine) {
        emoji = '💣';
        style = ButtonStyle.Danger;
      }

      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(isRevealed || game.over ? `mines:done:${gameId}:${idx}` : `mines:tile:${gameId}:${idx}`)
          .setLabel(emoji)
          .setStyle(style)
          .setDisabled(isRevealed || game.over),
      );
    }
    rows.push(actionRow);
  }

  // Rangée Cash Out
  const cashRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`mines:cashout:${gameId}`)
      .setLabel(
        game.safeRevealed === 0
          ? '💰 Cash Out (révèle d\'abord une tuile)'
          : `💰 Cash Out  ×${game.currentMult.toFixed(2)}  →  ${Math.floor(game.bet * game.currentMult)} 🪙`,
      )
      .setStyle(ButtonStyle.Primary)
      .setDisabled(game.over || game.safeRevealed === 0),
  );
  rows.push(cashRow);

  return rows;
}

export default {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('💣 Évite les mines, multiplie ta mise !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
    .addIntegerOption(o =>
      o.setName('mines').setDescription('Nombre de mines (1-10, défaut 3)').setRequired(false).setMinValue(1).setMaxValue(10),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet       = interaction.options.getInteger('mise', true);
    const mineCount = interaction.options.getInteger('mines') ?? 3;
    const guildId   = interaction.guildId!;
    const userId    = interaction.user.id;
    const gameId    = `${userId}:${guildId}`;

    if (games.has(gameId)) {
      return interaction.reply({ content: '⚠️ Tu as déjà une partie mines en cours !', ephemeral: true });
    }

    const user = await getUser(userId, guildId);
    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red).setDescription(`❌ Solde insuffisant — tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    await addBalance(userId, guildId, -bet);

    const mineSet: Set<number> = placeMines(mineCount);
    const game: MinesGame = {
      userId, guildId, bet, mineCount, mineSet,
      revealed: new Set(), safeRevealed: 0, currentMult: 1.00, over: false,
    };
    games.set(gameId, game);

    await interaction.reply({ embeds: [buildEmbed(game, 'playing')], components: buildGrid(game, gameId) });

    // Auto-expiry 5 min
    setTimeout(() => {
      if (games.has(gameId)) {
        games.get(gameId)!.over = true;
        games.delete(gameId);
      }
    }, 300_000);
  },

  async handleButton(interaction: ButtonInteraction) {
    const parts  = interaction.customId.split(':');
    const action = parts[1];
    const gameId = parts[2];
    const game   = games.get(gameId);

    if (!game) {
      return interaction.reply({ content: '⌛ Partie expirée — relance `/mines`.', ephemeral: true });
    }
    if (interaction.user.id !== game.userId) {
      return interaction.reply({ content: '❌ Ce n\'est pas ta partie !', ephemeral: true });
    }

    await interaction.deferUpdate();

    // ── Cash Out ──────────────────────────────────────────────────────────────
    if (action === 'cashout') {
      game.over = true;
      games.delete(gameId);

      const user = await getUser(game.userId, game.guildId);
      const luckEffect = await getActiveEffect(game.userId, game.guildId, 'luck');
      const luckMult   = luckEffect ? Number(luckEffect.value) : 1;
      const totalMult  = game.currentMult * luckMult;
      const payout     = Math.floor(game.bet * totalMult);
      const gain       = payout - game.bet;

      await addBalance(game.userId, game.guildId, payout);
      await addWin(game.userId, game.guildId);

      const embed = buildEmbed(game, 'won')
        .spliceFields(4, 1, { name: '💵 Gain net', value: formatBalance(gain), inline: true })
        .spliceFields(5, 1, { name: '🏦 Nouveau solde', value: formatBalance(user.balance + gain), inline: true });

      await interaction.editReply({ embeds: [embed], components: buildGrid(game, gameId, true) });
      return;
    }

    // ── Révéler une tuile ────────────────────────────────────────────────────
    if (action === 'tile') {
      const tileIdx = parseInt(parts[3]);
      if (game.revealed.has(tileIdx)) return;

      game.revealed.add(tileIdx);

      if (game.mineSet.has(tileIdx)) {
        // BOOM
        game.over = true;
        games.delete(gameId);

        await addLoss(game.userId, game.guildId);

        const user = await getUser(game.userId, game.guildId);
        const embed = buildEmbed(game, 'lost')
          .spliceFields(5, 1, { name: '🏦 Nouveau solde', value: formatBalance(user.balance - game.bet), inline: true });

        await interaction.editReply({ embeds: [embed], components: buildGrid(game, gameId, true) });
        return;
      }

      // Tuile sûre — mettre à jour le multiplicateur
      game.currentMult = nextMult(game.currentMult, game.safeRevealed, game.mineCount);
      game.safeRevealed++;

      // Toutes les tuiles sûres révélées → victoire auto
      const totalSafe = TOTAL_TILES - game.mineCount;
      if (game.safeRevealed >= totalSafe) {
        game.over = true;
        games.delete(gameId);

        const user = await getUser(game.userId, game.guildId);
        const payout = Math.floor(game.bet * game.currentMult);
        const gain   = payout - game.bet;
        await addBalance(game.userId, game.guildId, payout);
        await addWin(game.userId, game.guildId);

        const embed = buildEmbed(game, 'won')
          .setTitle(`💣 Mines — PARFAIT ! Toutes les tuiles sûres révélées !`)
          .spliceFields(5, 1, { name: '🏦 Nouveau solde', value: formatBalance(user.balance + gain), inline: true });

        await interaction.editReply({ embeds: [embed], components: buildGrid(game, gameId, true) });
        return;
      }

      await interaction.editReply({ embeds: [buildEmbed(game, 'playing')], components: buildGrid(game, gameId) });
    }
  },
};
