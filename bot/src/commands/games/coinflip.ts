import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getUser, addBalance, addWin, addLoss, getActiveEffect, consumeEffect } from '../../database/index.js';
import { Colors } from '../../utils/colors.js';
import { formatBalance } from '../../utils/economy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('🪙 Pile ou Face — double ou rien !')
    .addIntegerOption(o => o.setName('mise').setDescription('Montant à miser').setRequired(true).setMinValue(10))
    .addStringOption(o =>
      o.setName('choix').setDescription('Pile ou Face ?').setRequired(true)
        .addChoices({ name: '🪙 Pile', value: 'pile' }, { name: '💿 Face', value: 'face' })),

  async execute(interaction: ChatInputCommandInteraction) {
    const bet     = interaction.options.getInteger('mise', true);
    const choix   = interaction.options.getString('choix', true);
    const userId  = interaction.user.id;
    const guildId = interaction.guildId!;
    const user    = await getUser(userId, guildId);

    if (user.balance < bet) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(Colors.red)
          .setDescription(`❌ Solde insuffisant — tu as ${formatBalance(user.balance)}.`)],
        ephemeral: true,
      });
    }

    const result = Math.random() < 0.5 ? 'pile' : 'face';
    const won    = result === choix;

    // Effets boutique
    const [luckEffect, shieldEffect] = await Promise.all([
      getActiveEffect(userId, guildId, 'luck'),
      getActiveEffect(userId, guildId, 'shield'),
    ]);

    let gain: number;
    let shieldUsed = false;
    let luckUsed   = false;
    let color: number = Colors.blue;
    let title = '';

    if (won) {
      const luckMult = luckEffect ? Number(luckEffect.value) : 1;
      gain           = Math.floor(bet * luckMult);
      luckUsed       = !!luckEffect;
      await addWin(userId, guildId);
    } else if (shieldEffect) {
      gain       = 0; // Bouclier absorbe la perte
      shieldUsed = true;
      await consumeEffect(userId, guildId, 'shield');
    } else {
      gain = -bet;
      await addLoss(userId, guildId);
    }

    await addBalance(userId, guildId, gain);
    const newBalance = user.balance + gain;

    const choixLabel  = choix === 'pile'  ? '🪙 Pile'  : '💿 Face';
    const resultLabel = result === 'pile' ? '🪙 Pile'  : '💿 Face';

    if (shieldUsed) { title = '🛡️ PERDU — Bouclier activé !'; color = Colors.blue; }
    else if (won)   { title = luckUsed ? `✅ GAGNÉ ! ×${luckEffect!.value} 🍀` : '✅ GAGNÉ !'; color = Colors.green; }
    else            { title = '❌ PERDU !'; color = Colors.red; }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🪙 Coinflip — ${title}`)
      .setDescription(
        `Tu as joué **${choixLabel}**\n` +
        `La pièce est tombée sur **${resultLabel}**\n\n` +
        (shieldUsed
          ? '🛡️ *Ton Bouclier Magique a absorbé la perte ! Il est maintenant consommé.*'
          : won
            ? luckUsed
              ? `🤑 Tu doubles ta mise avec le bonus Trèfle Doré (×${luckEffect!.value}) !`
              : '🤑 Tu doubles ta mise !'
            : '😭 Tu perds ta mise !'),
      )
      .addFields(
        { name: '💰 Mise',
          value: formatBalance(bet), inline: true },
        { name: shieldUsed ? '🛡️ Perte absorbée' : won ? '🤑 Gain' : '📉 Perte',
          value: shieldUsed ? formatBalance(bet) : formatBalance(Math.abs(gain)), inline: true },
        { name: '🏦 Solde',
          value: formatBalance(newBalance), inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
