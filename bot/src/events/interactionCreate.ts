import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  StringSelectMenuInteraction,
} from 'discord.js';
import { commands } from '../index.js';

// Préfixes des boutons → nom de la commande propriétaire
const BUTTON_PREFIX_MAP: Record<string, string> = {
  bj:             'blackjack',
  duel_coinflip:  'duel-coinflip',
  duel_dice:      'duel-dice',
  duel_roulette:  'duel-roulette',
  shop_buy:       'buy',
  hl:             'highlow',
  crash:          'crash',
  mines:          'mines',
};

const SELECT_PREFIX_MAP: Record<string, string> = {
  shop_select: 'buy',
};

export async function handleInteraction(interaction: Interaction) {
  // ── Slash Commands ────────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction as ChatInputCommandInteraction);
    } catch (err) {
      console.error(`[CMD] ${interaction.commandName}:`, err);
      const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => null);
      else await interaction.reply(msg).catch(() => null);
    }
    return;
  }

  // ── Button Interactions ───────────────────────────────────────────────────────
  if (interaction.isButton()) {
    const btn    = interaction as ButtonInteraction;
    const prefix = btn.customId.split(':')[0];
    const cmdName = BUTTON_PREFIX_MAP[prefix];
    if (!cmdName) return;

    const cmd = commands.get(cmdName);
    if (!cmd?.handleButton) return;

    try {
      await cmd.handleButton(btn);
    } catch (err) {
      console.error(`[BTN] ${btn.customId}:`, err);
      const msg = { content: '❌ Erreur lors du traitement.', ephemeral: true };
      if (btn.replied || btn.deferred) await btn.followUp(msg).catch(() => null);
      else await btn.reply(msg).catch(() => null);
    }
    return;
  }

  // ── Select Menus ──────────────────────────────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    const sel     = interaction as StringSelectMenuInteraction;
    const prefix  = sel.customId.split(':')[0];
    const cmdName = SELECT_PREFIX_MAP[prefix];
    if (!cmdName) return;

    const cmd = commands.get(cmdName);
    if (!cmd?.handleSelect) return;

    try {
      await cmd.handleSelect(sel);
    } catch (err) {
      console.error(`[SEL] ${sel.customId}:`, err);
    }
  }
}
