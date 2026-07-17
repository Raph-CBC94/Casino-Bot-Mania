import { Collection } from 'discord.js';
import type { Command } from '../index.js';

// Economy
import balance     from './economy/balance.js';
import daily       from './economy/daily.js';
import work        from './economy/work.js';
import leaderboard from './economy/leaderboard.js';

// Games
import slots     from './games/slots.js';
import blackjack from './games/blackjack.js';
import coinflip  from './games/coinflip.js';
import dice      from './games/dice.js';
import roulette  from './games/roulette.js';
import highlow   from './games/highlow.js';
import crash     from './games/crash.js';
import mines     from './games/mines.js';

// Duels
import duelCoinflip from './duel/coinflip-duel.js';
import duelDice     from './duel/dice-duel.js';
import duelRoulette from './duel/roulette-duel.js';

// Shop
import shop      from './shop/shop.js';
import buy       from './shop/buy.js';
import inventory from './shop/inventory.js';

// Admin
import setshop       from './admin/setshop.js';
import addcoins      from './admin/addcoins.js';
import removecoins   from './admin/removecoins.js';
import additem       from './admin/additem.js';
import removeitem    from './admin/removeitem.js';
import initshop      from './admin/initshop.js';
import setleaderboard from './admin/setleaderboard.js';

const allCommands: Command[] = [
  // Économie
  balance, daily, work, leaderboard,
  // Jeux solo
  slots, blackjack, coinflip, dice, roulette, highlow, crash, mines,
  // Duels 1v1
  duelCoinflip, duelDice, duelRoulette,
  // Boutique
  shop, buy, inventory,
  // Admin
  setshop, addcoins, removecoins, additem, removeitem, initshop, setleaderboard,
];

export function loadCommands(collection: Collection<string, Command>) {
  for (const cmd of allCommands) {
    collection.set(cmd.data.name, cmd);
  }
  console.log(`📦  ${allCommands.length} commandes chargées`);
}

export { allCommands };
