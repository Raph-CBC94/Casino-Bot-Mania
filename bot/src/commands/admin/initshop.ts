import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getShopItems, addShopItem } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

const DEFAULT_ITEMS = [
  {
    name: 'Trèfle Doré',
    emoji: '🍀',
    price: 2500,
    description: '+20% de gains sur tous les jeux pendant 2h',
    effectType: 'luck',
    effectValue: 1.2,
    effectDuration: 7200,
  },
  {
    name: 'Bouclier Magique',
    emoji: '🛡️',
    price: 1500,
    description: 'Absorbe ta prochaine perte (1 utilisation, 24h)',
    effectType: 'shield',
    effectValue: 1,
    effectDuration: 86400,
  },
  {
    name: 'Turbo Worker',
    emoji: '⚡',
    price: 800,
    description: 'Réduit le cooldown /work à 30 min pendant 24h',
    effectType: 'work_cd',
    effectValue: 1800,
    effectDuration: 86400,
  },
  {
    name: 'Coffre Mystère',
    emoji: '🎁',
    price: 1200,
    description: 'Ouvre pour gagner entre 500 et 5 000 🪙 immédiatement !',
    effectType: 'mystery_box',
    effectValue: 1,
    effectDuration: 0,
  },
  {
    name: 'VIP Pass',
    emoji: '💎',
    price: 5000,
    description: 'Réduit le cooldown /daily à 12h pendant 48h',
    effectType: 'daily_cd',
    effectValue: 43200,
    effectDuration: 172800,
  },
  {
    name: 'Boost Travail',
    emoji: '🚀',
    price: 3000,
    description: 'Double les gains de /work pendant 4h',
    effectType: 'work_boost',
    effectValue: 2.0,
    effectDuration: 14400,
  },
] as const;

export default {
  data: new SlashCommandBuilder()
    .setName('initshop')
    .setDescription('🔧 [Admin] Initialise la boutique avec les articles par défaut')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    await interaction.deferReply({ ephemeral: true });

    const existing = await getShopItems(guildId);
    if (existing.length > 0) {
      return interaction.editReply({
        content: `⚠️ La boutique a déjà **${existing.length}** article(s). Utilise \`/removeitem\` pour vider avant de réinitialiser.`,
      });
    }

    const created: string[] = [];
    for (const item of DEFAULT_ITEMS) {
      await addShopItem(
        guildId, item.name, item.description, item.price, null, item.emoji,
        item.effectType, item.effectValue, item.effectDuration,
      );
      created.push(`${item.emoji} **${item.name}** — ${formatBalance(item.price)}`);
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.gold)
      .setTitle('🏪 Boutique initialisée !')
      .setDescription(
        `**${DEFAULT_ITEMS.length} articles** ont été ajoutés :\n\n` +
        created.join('\n') +
        '\n\n> Utilise `/setshop` pour poster le message de boutique dans un salon.',
      )
      .addFields(
        { name: '🍀 luck',        value: '+% gains sur tous les jeux', inline: true },
        { name: '🛡️ shield',      value: 'Absorbe 1 perte',           inline: true },
        { name: '⚡ work_cd',     value: 'Réduit cooldown /work',      inline: true },
        { name: '🎁 mystery_box', value: 'Coins aléatoires immédiats', inline: true },
        { name: '💎 daily_cd',    value: 'Réduit cooldown /daily',     inline: true },
        { name: '🚀 work_boost',  value: '×2 gains /work',             inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
