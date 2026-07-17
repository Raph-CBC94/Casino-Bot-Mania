"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInteraction = handleInteraction;
const index_js_1 = require("../index.js");
async function handleInteraction(interaction) {
    // ── Slash Commands ───────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
        const cmd = index_js_1.commands.get(interaction.commandName);
        if (!cmd)
            return;
        try {
            await cmd.execute(interaction);
        }
        catch (err) {
            console.error(`[CMD] ${interaction.commandName}:`, err);
            const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg).catch(() => null);
            }
            else {
                await interaction.reply(msg).catch(() => null);
            }
        }
        return;
    }
    // ── Button Interactions ──────────────────────────────────────────────────────
    if (interaction.isButton()) {
        const btn = interaction;
        const [prefix] = btn.customId.split(':');
        // Route to the command that owns this button
        for (const cmd of index_js_1.commands.values()) {
            if (cmd.handleButton) {
                // Check if this command handles this button prefix
                const prefixMap = {
                    bj: 'blackjack',
                    duel_coinflip: 'duel-coinflip',
                    duel_dice: 'duel-dice',
                    duel_roulette: 'duel-roulette',
                    shop_buy: 'buy',
                };
                if (prefixMap[prefix] === cmd.data.name) {
                    try {
                        await cmd.handleButton(btn);
                    }
                    catch (err) {
                        console.error(`[BTN] ${btn.customId}:`, err);
                        const msg = { content: '❌ Erreur lors du traitement.', ephemeral: true };
                        if (btn.replied || btn.deferred) {
                            await btn.followUp(msg).catch(() => null);
                        }
                        else {
                            await btn.reply(msg).catch(() => null);
                        }
                    }
                    return;
                }
            }
        }
        return;
    }
    // ── Select Menu ──────────────────────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
        const sel = interaction;
        const [prefix] = sel.customId.split(':');
        for (const cmd of index_js_1.commands.values()) {
            if (cmd.handleSelect) {
                const prefixMap = {
                    shop_select: 'buy',
                };
                if (prefixMap[prefix] === cmd.data.name) {
                    try {
                        await cmd.handleSelect(sel);
                    }
                    catch (err) {
                        console.error(`[SEL] ${sel.customId}:`, err);
                    }
                    return;
                }
            }
        }
    }
}
