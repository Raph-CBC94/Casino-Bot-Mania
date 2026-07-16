import {
  ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, SlashCommandBuilder,
} from 'discord.js';
import { getGuildSettings } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { postShopMessage } from '../../utils/shopMessage.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setshop')
    .setDescription('🔧 [Admin] Publie/actualise la boutique dans un salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon où afficher la boutique').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('salon', true);
    await interaction.deferReply({ ephemeral: true });

    const msgId = await postShopMessage(interaction.guildId!, channel.id);
    if (!msgId) {
      return interaction.editReply({ content: '❌ Impossible de poster le message. Vérifie les permissions du bot dans ce salon.' });
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.green)
      .setTitle('✅ Boutique publiée !')
      .setDescription(`La boutique est maintenant affichée dans <#${channel.id}>.\n\nElle sera mise à jour automatiquement lors des changements d'articles.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
