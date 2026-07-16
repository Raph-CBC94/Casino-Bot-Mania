import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, TextChannel,
} from 'discord.js';
import { getClient } from '../client.js';
import { getGuildSettings, getShopItems, setGuildSettings } from '../database/index.js';
import { Colors } from './colors.js';
import { formatBalance } from './economy.js';

export function buildShopEmbed(guildId: string) {
  const items = getShopItems(guildId);
  const embed = new EmbedBuilder()
    .setColor(Colors.gold)
    .setTitle('🛒 Boutique du Serveur')
    .setFooter({ text: 'Clique sur un article pour l\'acheter !' })
    .setTimestamp();

  if (!items.length) {
    embed.setDescription('*La boutique est vide pour le moment...*\nUn admin peut ajouter des articles avec `/additem`.');
    return { embed, rows: [] as ActionRowBuilder<ButtonBuilder>[] };
  }

  const desc = items.map(item =>
    `${item.emoji} **${item.name}** — ${formatBalance(item.price)}\n> ${item.description}${item.role_id ? `\n> Rôle attribué : <@&${item.role_id}>` : ''}`,
  ).join('\n\n');
  embed.setDescription(desc);

  // Build button rows (max 5 per row, max 5 rows = 25 buttons)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < Math.min(items.length, 25); i++) {
    const rowIdx = Math.floor(i / 5);
    if (!rows[rowIdx]) rows[rowIdx] = new ActionRowBuilder<ButtonBuilder>();
    rows[rowIdx].addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_buy:${items[i].id}`)
        .setLabel(`${items[i].emoji} ${items[i].name}`)
        .setStyle(ButtonStyle.Secondary),
    );
  }

  return { embed, rows };
}

export async function refreshShopMessage(guildId: string): Promise<void> {
  const settings = getGuildSettings(guildId);
  if (!settings?.shop_channel_id || !settings.shop_message_id) return;

  try {
    const client = getClient();
    const channel = await client.channels.fetch(settings.shop_channel_id) as TextChannel | null;
    if (!channel) return;
    const message = await channel.messages.fetch(settings.shop_message_id);
    const { embed, rows } = buildShopEmbed(guildId);
    await message.edit({ embeds: [embed], components: rows });
  } catch {
    // Message may have been deleted — ignore
  }
}

export async function postShopMessage(guildId: string, channelId: string): Promise<string | null> {
  try {
    const client = getClient();
    const channel = await client.channels.fetch(channelId) as TextChannel | null;
    if (!channel) return null;
    const { embed, rows } = buildShopEmbed(guildId);
    const msg = await channel.send({ embeds: [embed], components: rows });
    setGuildSettings(guildId, channelId, msg.id);
    return msg.id;
  } catch {
    return null;
  }
}
