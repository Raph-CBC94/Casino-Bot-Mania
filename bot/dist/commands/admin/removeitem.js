"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const shopMessage_js_1 = require("../../utils/shopMessage.js");
const colors_js_1 = require("../../utils/colors.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('removeitem')
        .setDescription('🔧 [Admin] Supprime un article de la boutique')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addIntegerOption(o => o.setName('id').setDescription('ID de l\'article (visible avec /shop)').setRequired(true).setMinValue(1)),
    async execute(interaction) {
        const itemId = interaction.options.getInteger('id', true);
        const item = await (0, index_js_1.getShopItem)(itemId, interaction.guildId);
        if (!item) {
            return interaction.reply({ content: `❌ Aucun article avec l'ID \`${itemId}\` sur ce serveur.`, ephemeral: true });
        }
        await (0, index_js_1.removeShopItem)(itemId, interaction.guildId);
        await (0, shopMessage_js_1.refreshShopMessage)(interaction.guildId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.red)
            .setTitle('🗑️ Article supprimé')
            .setDescription(`L'article **${item.emoji} ${item.name}** (ID: \`${itemId}\`) a été retiré de la boutique.`)
            .setFooter({ text: 'La boutique a été mise à jour automatiquement' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
