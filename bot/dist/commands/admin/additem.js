"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const shopMessage_js_1 = require("../../utils/shopMessage.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('additem')
        .setDescription('🔧 [Admin] Ajoute un article à la boutique')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('nom').setDescription('Nom de l\'article').setRequired(true))
        .addIntegerOption(o => o.setName('prix').setDescription('Prix en pièces').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('description').setDescription('Description').setRequired(false))
        .addRoleOption(o => o.setName('role').setDescription('Rôle à attribuer lors de l\'achat').setRequired(false))
        .addStringOption(o => o.setName('emoji').setDescription('Emoji de l\'article (défaut: 🎁)').setRequired(false)),
    async execute(interaction) {
        const name = interaction.options.getString('nom', true);
        const price = interaction.options.getInteger('prix', true);
        const desc = interaction.options.getString('description') ?? 'Aucune description';
        const role = interaction.options.getRole('role');
        const emoji = interaction.options.getString('emoji') ?? '🎁';
        const itemId = await (0, index_js_1.addShopItem)(interaction.guildId, name, desc, price, role?.id ?? null, emoji);
        await (0, shopMessage_js_1.refreshShopMessage)(interaction.guildId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_js_1.Colors.green)
            .setTitle('✅ Article ajouté !')
            .setDescription(`${emoji} **${name}** ajouté à la boutique !\n` +
            `ID : \`${itemId}\` | Prix : ${(0, economy_js_1.formatBalance)(price)}\n` +
            (role ? `Rôle : <@&${role.id}>` : ''))
            .setFooter({ text: 'La boutique a été mise à jour automatiquement' })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
