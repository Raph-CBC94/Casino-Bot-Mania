import {
  ChannelType, ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, SlashCommandBuilder, TextChannel,
} from 'discord.js';
import { getLeaderboard, setLeaderboardMessage } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { buildLeaderboardEmbed } from '../economy/leaderboard.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setleaderboard')
    .setDescription('🔧 [Admin] Affiche un leaderboard live qui s\'actualise toutes les minutes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon')
        .setDescription('Salon où poster le classement live')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('salon', true) as TextChannel;
    const guildId = interaction.guildId!;

    await interaction.deferReply({ ephemeral: true });

    const rows = await getLeaderboard(guildId, 10);
    const embed = buildLeaderboardEmbed(rows);

    const msg = await channel.send({ embeds: [embed] });
    await setLeaderboardMessage(guildId, channel.id, msg.id);

    await interaction.editReply({
      content: `✅ Leaderboard live posté dans ${channel} et enregistré ! Il s'actualisera **toutes les minutes**.`,
    });
  },
};
