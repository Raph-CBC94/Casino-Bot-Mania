import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, setWorkLast, getActiveEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { WORK_COOLDOWN, WORK_MIN, WORK_MAX, formatBalance, randomInt } from '../../utils/economy.js';

const JOBS = [
  { label: 'dealer de casino',        emoji: '🎰' },
  { label: 'croupier VIP',            emoji: '🃏' },
  { label: 'vigile d\'élite',         emoji: '💪' },
  { label: 'barman du Rooftop',       emoji: '🍸' },
  { label: 'comptable de l\'ombre',   emoji: '📊' },
  { label: 'chauffeur de limousine',  emoji: '🚗' },
  { label: 'chef de rang étoilé',     emoji: '🍽️' },
  { label: 'testeur de machines',     emoji: '🎲' },
  { label: 'DJ de la soirée',         emoji: '🎧' },
  { label: 'agent de sécurité',       emoji: '🕵️' },
];

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('💼 Travaille pour gagner des pièces (cooldown 1h)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId  = interaction.user.id;
    const guildId = interaction.guildId!;
    const user    = await getUser(userId, guildId);
    const now     = Math.floor(Date.now() / 1000);

    // Vérifie l'effet Turbo Worker (cooldown réduit)
    const cdEffect  = await getActiveEffect(userId, guildId, 'work_cd');
    const cooldown  = cdEffect ? Math.floor(Number(cdEffect.value)) : WORK_COOLDOWN;
    const elapsed   = now - user.work_last;
    const remaining = cooldown - elapsed;

    if (elapsed < cooldown) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.orange)
            .setTitle('😴 T\'es en pause !')
            .setDescription(`Reprends le boulot dans **${formatDuration(remaining)}**`)
            .addFields(
              { name: '⚡ Cooldown', value: cdEffect ? `${Math.floor(cooldown / 60)}min (Turbo ⚡)` : '60 min', inline: true },
              { name: '🏦 Solde',   value: formatBalance(user.balance),                                          inline: true },
            )
            .setFooter({ text: 'Achète Turbo Worker en boutique pour réduire ce délai !' }),
        ],
        ephemeral: true,
      });
    }

    // Vérifie l'effet Boost Travail (gains ×2)
    const boostEffect = await getActiveEffect(userId, guildId, 'work_boost');
    const boostMult   = boostEffect ? Number(boostEffect.value) : 1;
    const base        = randomInt(WORK_MIN, WORK_MAX);
    const earned      = Math.floor(base * boostMult);

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    await addBalance(userId, guildId, earned);
    await setWorkLast(userId, guildId, now);

    const embed = new EmbedBuilder()
      .setColor(Colors.teal)
      .setTitle(`${job.emoji} Travail terminé !`)
      .setDescription(
        `Tu as bossé comme **${job.label}** et gagné ${formatBalance(earned)}` +
        (boostEffect ? ` *(Boost ×${boostMult} 🚀)*` : '') + ' !',
      )
      .addFields(
        { name: '🏦 Nouveau solde',  value: formatBalance(user.balance + earned),               inline: true },
        { name: '⏱️ Prochain travail', value: cdEffect ? `dans ${Math.floor(cooldown / 60)}min ⚡` : 'dans 1h', inline: true },
      )
      .setFooter({ text: 'Reviens régulièrement pour accumuler tes gains 💰' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
