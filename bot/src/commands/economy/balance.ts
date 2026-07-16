import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Affiche ton solde de pièces 🪙')
    .addUserOption(o => o.setName('user').setDescription('Voir le solde d\'un autre joueur')),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const user = await getUser(target.id, interaction.guildId!);
    const ratio = user.wins + user.losses > 0
      ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1)
      : '0.0';

    const embed = new EmbedBuilder()
      .setColor(Colors.gold)
      .setTitle(`💰 Portefeuille de ${target.displayName}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🪙 Solde', value: formatBalance(user.balance), inline: true },
        { name: '🏆 Victoires', value: `\`${user.wins}\``, inline: true },
        { name: '💀 Défaites', value: `\`${user.losses}\``, inline: true },
        { name: '📊 Ratio V/D', value: `\`${ratio}%\``, inline: true },
      )
      .setFooter({ text: 'Casino Discord • /daily pour gagner des pièces' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
