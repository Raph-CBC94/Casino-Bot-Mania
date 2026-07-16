import {
  ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, SlashCommandBuilder,
} from 'discord.js';
import { addShopItem } from '../../database/index.js';
import { refreshShopMessage } from '../../utils/shopMessage.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('🔧 [Admin] Ajoute un article à la boutique')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('nom').setDescription('Nom de l\'article').setRequired(true))
    .addIntegerOption(o => o.setName('prix').setDescription('Prix en pièces').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('description').setDescription('Description').setRequired(false))
    .addRoleOption(o => o.setName('role').setDescription('Rôle à attribuer lors de l\'achat').setRequired(false))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji de l\'article (défaut: 🎁)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('nom', true);
    const price = interaction.options.getInteger('prix', true);
    const desc = interaction.options.getString('description') ?? 'Aucune description';
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji') ?? '🎁';

    const itemId = await addShopItem(interaction.guildId!, name, desc, price, role?.id ?? null, emoji);
    await refreshShopMessage(interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(Colors.green)
      .setTitle('✅ Article ajouté !')
      .setDescription(
        `${emoji} **${name}** ajouté à la boutique !\n` +
        `ID : \`${itemId}\` | Prix : ${formatBalance(price)}\n` +
        (role ? `Rôle : <@&${role.id}>` : ''),
      )
      .setFooter({ text: 'La boutique a été mise à jour automatiquement' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
