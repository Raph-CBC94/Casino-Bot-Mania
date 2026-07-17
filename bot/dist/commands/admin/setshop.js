"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const colors_js_1 = require("../../utils/colors.js");
const shopMessage_js_1 = require("../../utils/shopMessage.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('setshop')
        .setDescription('🔧 [Admin] Publie/actualise la boutique dans un salon')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addChannelOption(o => o.setName('salon').setDescription('Salon où afficher la boutique').setRequired(true)),
    async execute(interaction) {
        const channel = interaction.options.getChannel('salon', true);
        await interaction.deferReply({ ephemeral: true });
        const msgId = await (0, shopMessage_js_1.postShopMessage)(interaction.guildId, channel.id);
        if (!msgId) {
            return interaction.editReply({ content: '❌ Impossible de poster le message. Vérifie les permissions du bot dans ce salon.' });
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.green)
            .setTitle('✅ Boutique publiée !')
            .setDescription(`La boutique est maintenant affichée dans <#${channel.id}>.\n\nElle sera mise à jour automatiquement lors des changements d'articles.`)
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },
};
