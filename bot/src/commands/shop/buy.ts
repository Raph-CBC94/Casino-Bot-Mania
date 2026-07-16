import {
  ButtonInteraction, ChatInputCommandInteraction,
  EmbedBuilder, GuildMember, SlashCommandBuilder,
} from 'discord.js';
import { getUser, getShopItem, addBalance, addUserItem } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

async function buyItem(
  userId: string,
  guildId: string,
  itemId: number,
  interaction: ChatInputCommandInteraction | ButtonInteraction,
) {
  const item = await getShopItem(itemId, guildId);
  if (!item) {
    return interaction.reply({ content: '❌ Article introuvable.', ephemeral: true });
  }

  const user = await getUser(userId, guildId);
  if (user.balance < item.price) {
    return interaction.reply({
      content: `❌ Solde insuffisant ! Tu as ${formatBalance(user.balance)} mais cet article coûte ${formatBalance(item.price)}.`,
      ephemeral: true,
    });
  }

  await addBalance(userId, guildId, -item.price);
  await addUserItem(userId, guildId, itemId);

  // Attribuer le rôle si configuré
  if (item.role_id && interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(userId);
      if (member instanceof GuildMember) {
        await member.roles.add(item.role_id);
      }
    } catch {
      // Ignore role assignment errors
    }
  }

  const embed = new EmbedBuilder()
    .setColor(Colors.green)
    .setTitle('🛒 Achat réussi !')
    .setDescription(
      `Tu as acheté **${item.emoji} ${item.name}** pour ${formatBalance(item.price)} !\n` +
      (item.role_id ? `Le rôle <@&${item.role_id}> t'a été attribué.\n` : '') +
      `\nNouveau solde : ${formatBalance(user.balance - item.price)}`,
    )
    .setTimestamp();

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('🛒 Achète un article de la boutique')
    .addIntegerOption(o => o.setName('id').setDescription('ID de l\'article (visible avec /shop)').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const itemId = interaction.options.getInteger('id', true);
    await buyItem(interaction.user.id, interaction.guildId!, itemId, interaction);
  },

  async handleButton(interaction: ButtonInteraction) {
    const [, itemIdStr] = interaction.customId.split(':');
    const itemId = parseInt(itemIdStr);
    if (isNaN(itemId)) return interaction.reply({ content: '❌ ID invalide.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    await buyItem(interaction.user.id, interaction.guildId!, itemId, interaction);
  },
};
