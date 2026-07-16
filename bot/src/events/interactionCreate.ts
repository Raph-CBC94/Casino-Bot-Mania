import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  StringSelectMenuInteraction,
} from 'discord.js';
import { commands } from '../index.js';

export async function handleInteraction(interaction: Interaction) {
  // ── Slash Commands ───────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      console.error(`[CMD] ${interaction.commandName}:`, err);
      const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => null);
      } else {
        await interaction.reply(msg).catch(() => null);
      }
    }
    return;
  }

  // ── Button Interactions ──────────────────────────────────────────────────────
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;
    const [prefix] = btn.customId.split(':');
    // Route to the command that owns this button
    for (const cmd of commands.values()) {
      if (cmd.handleButton) {
        // Check if this command handles this button prefix
        const prefixMap: Record<string, string> = {
          bj: 'blackjack',
          duel_coinflip: 'duel-coinflip',
          duel_dice: 'duel-dice',
          duel_roulette: 'duel-roulette',
          shop_buy: 'buy',
        };
        if (prefixMap[prefix] === cmd.data.name) {
          try {
            await cmd.handleButton(btn);
          } catch (err) {
            console.error(`[BTN] ${btn.customId}:`, err);
            const msg = { content: '❌ Erreur lors du traitement.', ephemeral: true };
            if (btn.replied || btn.deferred) {
              await btn.followUp(msg).catch(() => null);
            } else {
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
    const sel = interaction as StringSelectMenuInteraction;
    const [prefix] = sel.customId.split(':');
    for (const cmd of commands.values()) {
      if (cmd.handleSelect) {
        const prefixMap: Record<string, string> = {
          shop_select: 'buy',
        };
        if (prefixMap[prefix] === cmd.data.name) {
          try {
            await cmd.handleSelect(sel);
          } catch (err) {
            console.error(`[SEL] ${sel.customId}:`, err);
          }
          return;
        }
      }
    }
  }
}
