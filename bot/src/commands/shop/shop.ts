import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { buildShopEmbed } from '../../utils/shopMessage.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🛒 Affiche la boutique du serveur'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { embed, rows } = buildShopEmbed(interaction.guildId!);
    await interaction.reply({ embeds: [embed], components: rows, ephemeral: false });
  },
};
