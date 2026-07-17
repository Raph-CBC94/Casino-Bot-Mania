import {
  ButtonInteraction, ChatInputCommandInteraction,
  EmbedBuilder, GuildMember, SlashCommandBuilder,
} from 'discord.js';
import { getUser, getShopItem, addBalance, addUserItem, addEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance, randomInt } from '../../utils/economy.js';

const EFFECT_LABELS: Record<string, string> = {
  luck:        '🍀 +% gains sur tous les jeux',
  shield:      '🛡️ Prochaine perte absorbée',
  work_cd:     '⚡ Cooldown /work réduit',
  work_boost:  '🚀 Gains /work doublés',
  daily_cd:    '💎 Cooldown /daily réduit',
  mystery_box: '🎁 Gain immédiat aléatoire',
};

function formatDuration(sec: number): string {
  if (sec === 0) return 'Immédiat';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

async function buyItem(
  userId: string,
  guildId: string,
  itemId: number,
  interaction: ChatInputCommandInteraction | ButtonInteraction,
) {
  const item = await getShopItem(itemId, guildId);
  if (!item) {
    const msg = { content: '❌ Article introuvable.', ephemeral: true };
    return interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
  }

  const user = await getUser(userId, guildId);
  if (user.balance < item.price) {
    const msg = {
      content: `❌ Solde insuffisant — tu as ${formatBalance(user.balance)} mais cet article coûte ${formatBalance(item.price)}.`,
      ephemeral: true,
    };
    return interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
  }

  await addBalance(userId, guildId, -item.price);
  await addUserItem(userId, guildId, itemId);

  // Attribuer rôle si configuré
  if (item.role_id && interaction.guild) {
    try {
      const member = await interaction.guild.members.fetch(userId);
      if (member instanceof GuildMember) await member.roles.add(item.role_id);
    } catch { /* ignore */ }
  }

  // Appliquer l'effet
  let effectDesc = '';
  let bonusCoins = 0;

  if (item.effect_type === 'mystery_box') {
    bonusCoins = randomInt(500, 5000);
    await addBalance(userId, guildId, bonusCoins);
    effectDesc = `🎁 **Coffre ouvert !** Tu as gagné **${formatBalance(bonusCoins)}** en bonus !`;
  } else if (item.effect_type && item.effect_duration > 0) {
    await addEffect(userId, guildId, item.effect_type, item.effect_value, item.effect_duration);
    const label    = EFFECT_LABELS[item.effect_type] ?? item.effect_type;
    const duration = formatDuration(item.effect_duration);
    effectDesc = `✨ **Effet activé :** ${label}\n⏱️ Durée : **${duration}**`;
  }

  const newBalance = user.balance - item.price + bonusCoins;

  const embed = new EmbedBuilder()
    .setColor(Colors.green)
    .setTitle(`🛒 Achat réussi — ${item.emoji} ${item.name}`)
    .setDescription(
      (item.role_id ? `Le rôle <@&${item.role_id}> t'a été attribué.\n` : '') +
      (effectDesc ? `\n${effectDesc}\n` : '') +
      `\nNouveau solde : ${formatBalance(newBalance)}`,
    )
    .addFields({ name: '💸 Prix payé', value: formatBalance(item.price), inline: true })
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
