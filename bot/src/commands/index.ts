import { Collection } from 'discord.js';
import type { Command } from '../index.js';

// Economy
import balance from './economy/balance.js';
import daily from './economy/daily.js';
import work from './economy/work.js';
import leaderboard from './economy/leaderboard.js';

// Games
import slots from './games/slots.js';
import blackjack from './games/blackjack.js';
import coinflip from './games/coinflip.js';
import dice from './games/dice.js';
import roulette from './games/roulette.js';

// Duels
import duelCoinflip from './duel/coinflip-duel.js';
import duelDice from './duel/dice-duel.js';
import duelRoulette from './duel/roulette-duel.js';

// Shop
import shop from './shop/shop.js';
import buy from './shop/buy.js';
import inventory from './shop/inventory.js';

// Admin
import setshop from './admin/setshop.js';
import addcoins from './admin/addcoins.js';
import removecoins from './admin/removecoins.js';
import additem from './admin/additem.js';
import removeitem from './admin/removeitem.js';

const allCommands: Command[] = [
  balance, daily, work, leaderboard,
  slots, blackjack, coinflip, dice, roulette,
  duelCoinflip, duelDice, duelRoulette,
  shop, buy, inventory,
  setshop, addcoins, removecoins, additem, removeitem,
];

export function loadCommands(collection: Collection<string, Command>) {
  for (const cmd of allCommands) {
    collection.set(cmd.data.name, cmd);
  }
  console.log(`📦  ${allCommands.length} commandes chargées`);
}

export { allCommands };
