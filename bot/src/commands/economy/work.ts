import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, setWorkLast } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { WORK_COOLDOWN, WORK_MIN, WORK_MAX, formatBalance, randomInt } from '../../utils/economy.js';

const JOBS = [
  { label: 'dealer de casino', emoji: '🎰' },
  { label: 'croupier', emoji: '🃏' },
  { label: 'vigile', emoji: '💪' },
  { label: 'barman VIP', emoji: '🍸' },
  { label: 'comptable louche', emoji: '📊' },
  { label: 'chauffeur de limousine', emoji: '🚗' },
  { label: 'chef de rang', emoji: '🍽️' },
  { label: 'testeur de machines à sous', emoji: '🎲' },
];

export default {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Travaille pour gagner des pièces 💼 (cooldown 1h)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = await getUser(interaction.user.id, interaction.guildId!);
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - user.work_last;
    const remaining = WORK_COOLDOWN - elapsed;

    if (elapsed < WORK_COOLDOWN) {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const embed = new EmbedBuilder()
        .setColor(Colors.orange)
        .setTitle('😴 T\'es en pause !')
        .setDescription(`Reprends le boulot dans **${m}m ${s}s**`)
        .setFooter({ text: 'Le casino t\'attend' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const earned = randomInt(WORK_MIN, WORK_MAX);
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    await addBalance(interaction.user.id, interaction.guildId!, earned);
    await setWorkLast(interaction.user.id, interaction.guildId!, now);

    const embed = new EmbedBuilder()
      .setColor(Colors.teal)
      .setTitle(`${job.emoji} Travail terminé !`)
      .setDescription(`Tu as bossé comme **${job.label}** et gagné ${formatBalance(earned)} !\nNouveau solde : ${formatBalance(user.balance + earned)}`)
      .setFooter({ text: 'Reviens dans 1h pour retravailler' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
