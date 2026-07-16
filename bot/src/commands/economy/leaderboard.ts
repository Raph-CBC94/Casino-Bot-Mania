import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getLeaderboard } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top 10 des joueurs les plus riches 👑'),

  async execute(interaction: ChatInputCommandInteraction) {
    const rows = getLeaderboard(interaction.guildId!);
    if (!rows.length) {
      return interaction.reply({ content: 'Aucun joueur enregistré sur ce serveur.', ephemeral: true });
    }

    const lines = rows.map((u, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      return `${medal} <@${u.user_id}> — **${u.balance.toLocaleString('fr-FR')} 🪙**`;
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.gold)
      .setTitle('👑 Classement — Top Richissimes')
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Joue et monte dans le classement !' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
