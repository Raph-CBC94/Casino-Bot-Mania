import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getLeaderboard, UserRow } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export function buildLeaderboardEmbed(rows: UserRow[]): EmbedBuilder {
  if (!rows.length) {
    return new EmbedBuilder()
      .setColor(Colors.gold)
      .setTitle('👑 Classement — Les Plus Riches')
      .setDescription('*Aucun joueur enregistré pour l\'instant.*')
      .setFooter({ text: '🔄 Actualisé toutes les minutes' })
      .setTimestamp();
  }

  const max = rows[0].balance || 1;

  const lines = rows.map((u, i) => {
    const medal = MEDALS[i] ?? `**${i + 1}.**`;
    const pct   = Math.max(1, Math.round((u.balance / max) * 8));
    const bar   = '█'.repeat(pct).padEnd(8, '░');
    const ratio = u.wins + u.losses > 0
      ? `${Math.round((u.wins / (u.wins + u.losses)) * 100)}% V`
      : '—';
    return `${medal} <@${u.user_id}>\n\`${bar}\` **${u.balance.toLocaleString('fr-FR')} 🪙**  ·  ${ratio}`;
  });

  return new EmbedBuilder()
    .setColor(Colors.gold)
    .setTitle('👑 Classement — Les Plus Riches')
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: '🔄 Actualisé toutes les minutes — /daily /work pour grimper !' })
    .setTimestamp();
}

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('👑 Top 10 des joueurs les plus riches du serveur'),

  async execute(interaction: ChatInputCommandInteraction) {
    const rows = await getLeaderboard(interaction.guildId!);
    await interaction.reply({ embeds: [buildLeaderboardEmbed(rows)] });
  },
};
