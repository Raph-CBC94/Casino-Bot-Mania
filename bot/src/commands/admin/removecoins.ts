import {
  ChatInputCommandInteraction, EmbedBuilder,
  PermissionFlagsBits, SlashCommandBuilder,
} from 'discord.js';
import { addBalance, getUser } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removecoins')
    .setDescription('🔧 [Admin] Retire des pièces à un joueur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o => o.setName('joueur').setDescription('Le joueur ciblé').setRequired(true))
    .addIntegerOption(o => o.setName('montant').setDescription('Montant à retirer').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('joueur', true);
    const amount = interaction.options.getInteger('montant', true);

    const user = await getUser(target.id, interaction.guildId!);
    const actualAmount = Math.min(amount, user.balance);
    await addBalance(target.id, interaction.guildId!, -actualAmount);
    const updated = await getUser(target.id, interaction.guildId!);

    const embed = new EmbedBuilder()
      .setColor(Colors.orange)
      .setTitle('💸 Pièces retirées')
      .setDescription(`${formatBalance(actualAmount)} ont été retirées à <@${target.id}>.\nNouveau solde : ${formatBalance(updated.balance)}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
