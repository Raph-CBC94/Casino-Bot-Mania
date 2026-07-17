"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('removecoins')
        .setDescription('🔧 [Admin] Retire des pièces à un joueur')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('joueur').setDescription('Le joueur ciblé').setRequired(true))
        .addIntegerOption(o => o.setName('montant').setDescription('Montant à retirer').setRequired(true).setMinValue(1)),
    async execute(interaction) {
        const target = interaction.options.getUser('joueur', true);
        const amount = interaction.options.getInteger('montant', true);
        const user = await (0, index_js_1.getUser)(target.id, interaction.guildId);
        const actualAmount = Math.min(amount, user.balance);
        await (0, index_js_1.addBalance)(target.id, interaction.guildId, -actualAmount);
        const updated = await (0, index_js_1.getUser)(target.id, interaction.guildId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.orange)
            .setTitle('💸 Pièces retirées')
            .setDescription(`${(0, economy_js_1.formatBalance)(actualAmount)} ont été retirées à <@${target.id}>.\nNouveau solde : ${(0, economy_js_1.formatBalance)(updated.balance)}`)
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
