"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const index_js_1 = require("../../database/index.js");
const colors_js_1 = require("../../utils/colors.js");
const economy_js_1 = require("../../utils/economy.js");
async function buyItem(userId, guildId, itemId, interaction) {
    const item = await (0, index_js_1.getShopItem)(itemId, guildId);
    if (!item) {
        return interaction.reply({ content: '❌ Article introuvable.', ephemeral: true });
    }
    const user = await (0, index_js_1.getUser)(userId, guildId);
    if (user.balance < item.price) {
        return interaction.reply({
            content: `❌ Solde insuffisant ! Tu as ${(0, economy_js_1.formatBalance)(user.balance)} mais cet article coûte ${(0, economy_js_1.formatBalance)(item.price)}.`,
            ephemeral: true,
        });
    }
    await (0, index_js_1.addBalance)(userId, guildId, -item.price);
    await (0, index_js_1.addUserItem)(userId, guildId, itemId);
    // Attribuer le rôle si configuré
    if (item.role_id && interaction.guild) {
        try {
            const member = await interaction.guild.members.fetch(userId);
            if (member instanceof discord_js_1.GuildMember) {
                await member.roles.add(item.role_id);
            }
        }
        catch {
            // Ignore role assignment errors
        }
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(colors_js_1.Colors.green)
        .setTitle('🛒 Achat réussi !')
        .setDescription(`Tu as acheté **${item.emoji} ${item.name}** pour ${(0, economy_js_1.formatBalance)(item.price)} !\n` +
        (item.role_id ? `Le rôle <@&${item.role_id}> t'a été attribué.\n` : '') +
        `\nNouveau solde : ${(0, economy_js_1.formatBalance)(user.balance - item.price)}`)
        .setTimestamp();
    if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
    else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('buy')
        .setDescription('🛒 Achète un article de la boutique')
        .addIntegerOption(o => o.setName('id').setDescription('ID de l\'article (visible avec /shop)').setRequired(true).setMinValue(1)),
    async execute(interaction) {
        const itemId = interaction.options.getInteger('id', true);
        await buyItem(interaction.user.id, interaction.guildId, itemId, interaction);
    },
    async handleButton(interaction) {
        const [, itemIdStr] = interaction.customId.split(':');
        const itemId = parseInt(itemIdStr);
        if (isNaN(itemId))
            return interaction.reply({ content: '❌ ID invalide.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        await buyItem(interaction.user.id, interaction.guildId, itemId, interaction);
    },
};
