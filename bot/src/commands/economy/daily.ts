import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, setDailyLast } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { DAILY_AMOUNT, DAILY_COOLDOWN, formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription(`Réclame tes ${DAILY_AMOUNT} 🪙 quotidiens`),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = await getUser(interaction.user.id, interaction.guildId!);
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - user.daily_last;
    const remaining = DAILY_COOLDOWN - elapsed;

    if (elapsed < DAILY_COOLDOWN) {
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const embed = new EmbedBuilder()
        .setColor(Colors.red)
        .setTitle('⏳ Déjà réclamé !')
        .setDescription(`Reviens dans **${h}h ${m}m** pour ton prochain daily.`)
        .setFooter({ text: 'Patience c\'est une vertu 🙏' });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await addBalance(interaction.user.id, interaction.guildId!, DAILY_AMOUNT);
    await setDailyLast(interaction.user.id, interaction.guildId!, now);

    const embed = new EmbedBuilder()
      .setColor(Colors.green)
      .setTitle('🎁 Daily réclamé !')
      .setDescription(`Tu as reçu ${formatBalance(DAILY_AMOUNT)} !\nSolde : ${formatBalance(user.balance + DAILY_AMOUNT)}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Reviens demain pour plus 🔥' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
