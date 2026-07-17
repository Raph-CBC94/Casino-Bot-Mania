import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, setDailyLast, getActiveEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { DAILY_AMOUNT, DAILY_COOLDOWN, formatBalance } from '../../utils/economy.js';

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function progressBar(elapsed: number, total: number): string {
  const pct   = Math.min(elapsed / total, 1);
  const done  = Math.round(pct * 10);
  return '█'.repeat(done).padEnd(10, '░') + ` ${Math.round(pct * 100)}%`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription(`🎁 Réclame tes ${DAILY_AMOUNT} 🪙 quotidiens`),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId  = interaction.user.id;
    const guildId = interaction.guildId!;
    const user    = await getUser(userId, guildId);
    const now     = Math.floor(Date.now() / 1000);

    // Vérifie l'effet VIP Pass (daily_cd réduit)
    const cdEffect  = await getActiveEffect(userId, guildId, 'daily_cd');
    const cooldown  = cdEffect ? Math.floor(Number(cdEffect.value)) : DAILY_COOLDOWN;
    const elapsed   = now - user.daily_last;
    const remaining = cooldown - elapsed;

    if (elapsed < cooldown) {
      const embed = new EmbedBuilder()
        .setColor(Colors.red)
        .setTitle('⏳ Daily déjà réclamé !')
        .setDescription(
          `Reviens dans **${formatDuration(remaining)}**\n\n` +
          `\`${progressBar(elapsed, cooldown)}\``,
        )
        .addFields(
          { name: '⏱️ Cooldown',  value: cdEffect ? `${formatDuration(cooldown)} (VIP 💎)` : '24h',   inline: true },
          { name: '🏦 Solde',     value: formatBalance(user.balance),                                  inline: true },
        )
        .setFooter({ text: 'Achète le VIP Pass en boutique pour réduire ce délai !' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await addBalance(userId, guildId, DAILY_AMOUNT);
    await setDailyLast(userId, guildId, now);
    const newBalance = user.balance + DAILY_AMOUNT;

    const embed = new EmbedBuilder()
      .setColor(Colors.green)
      .setTitle('🎁 Daily réclamé !')
      .setDescription(`Tu as reçu ${formatBalance(DAILY_AMOUNT)} !`)
      .addFields(
        { name: '🏦 Nouveau solde', value: formatBalance(newBalance),                                   inline: true },
        { name: '⏱️ Prochain daily', value: cdEffect ? `dans ${formatDuration(cooldown)} 💎` : 'dans 24h', inline: true },
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Reviens chaque jour pour accumuler tes pièces ! 🔥' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
