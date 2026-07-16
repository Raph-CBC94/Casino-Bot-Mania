import {
  ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, SlashCommandBuilder,
} from 'discord.js';
import { addBalance, getUser } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('addcoins')
    .setDescription('🔧 [Admin] Ajoute des pièces à un joueur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o => o.setName('joueur').setDescription('Le joueur ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('montant').setDescription('Montant à ajouter').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('joueur', true);
    const amount = interaction.options.getInteger('montant', true);

    addBalance(target.id, interaction.guildId!, amount);
    const user = getUser(target.id, interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(Colors.green)
      .setTitle('💰 Pièces ajoutées')
      .setDescription(`${formatBalance(amount)} ont été ajoutées à <@${target.id}>.\nNouveau solde : ${formatBalance(user.balance)}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
