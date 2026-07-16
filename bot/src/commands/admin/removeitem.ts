import {
  ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, SlashCommandBuilder,
} from 'discord.js';
import { getShopItem, removeShopItem } from '../../database/index.js';
import { refreshShopMessage } from '../../utils/shopMessage.js';
import { Colors } from '../../utils/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('🔧 [Admin] Supprime un article de la boutique')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(o => o.setName('id').setDescription('ID de l\'article (visible avec /shop)').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const itemId = interaction.options.getInteger('id', true);
    const item = await getShopItem(itemId, interaction.guildId!);

    if (!item) {
      return interaction.reply({ content: `❌ Aucun article avec l'ID \`${itemId}\` sur ce serveur.`, ephemeral: true });
    }

    await removeShopItem(itemId, interaction.guildId!);
    await refreshShopMessage(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(Colors.red)
      .setTitle('🗑️ Article supprimé')
      .setDescription(`L'article **${item.emoji} ${item.name}** (ID: \`${itemId}\`) a été retiré de la boutique.`)
      .setFooter({ text: 'La boutique a été mise à jour automatiquement' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
