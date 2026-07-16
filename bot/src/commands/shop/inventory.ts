import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUserItems } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('🎒 Affiche ton inventaire'),

  async execute(interaction: ChatInputCommandInteraction) {
    const items = getUserItems(interaction.user.id, interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(Colors.purple)
      .setTitle(`🎒 Inventaire de ${interaction.user.displayName}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    if (!items.length) {
      embed.setDescription('*Ton inventaire est vide !*\nUtilise `/shop` pour acheter des articles.');
    } else {
      embed.setDescription(
        items.map(i =>
          `${i.emoji} **${i.name}** ×${i.quantity}\n> ${i.description} — Valeur : ${formatBalance(i.price)}`,
        ).join('\n\n'),
      );
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
