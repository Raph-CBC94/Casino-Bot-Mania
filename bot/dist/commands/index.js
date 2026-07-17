"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allCommands = void 0;
exports.loadCommands = loadCommands;
// Economy
const balance_js_1 = __importDefault(require("./economy/balance.js"));
const daily_js_1 = __importDefault(require("./economy/daily.js"));
const work_js_1 = __importDefault(require("./economy/work.js"));
const leaderboard_js_1 = __importDefault(require("./economy/leaderboard.js"));
// Games
const slots_js_1 = __importDefault(require("./games/slots.js"));
const blackjack_js_1 = __importDefault(require("./games/blackjack.js"));
const coinflip_js_1 = __importDefault(require("./games/coinflip.js"));
const dice_js_1 = __importDefault(require("./games/dice.js"));
const roulette_js_1 = __importDefault(require("./games/roulette.js"));
// Duels
const coinflip_duel_js_1 = __importDefault(require("./duel/coinflip-duel.js"));
const dice_duel_js_1 = __importDefault(require("./duel/dice-duel.js"));
const roulette_duel_js_1 = __importDefault(require("./duel/roulette-duel.js"));
// Shop
const shop_js_1 = __importDefault(require("./shop/shop.js"));
const buy_js_1 = __importDefault(require("./shop/buy.js"));
const inventory_js_1 = __importDefault(require("./shop/inventory.js"));
// Admin
const setshop_js_1 = __importDefault(require("./admin/setshop.js"));
const addcoins_js_1 = __importDefault(require("./admin/addcoins.js"));
const removecoins_js_1 = __importDefault(require("./admin/removecoins.js"));
const additem_js_1 = __importDefault(require("./admin/additem.js"));
const removeitem_js_1 = __importDefault(require("./admin/removeitem.js"));
const allCommands = [
    balance_js_1.default, daily_js_1.default, work_js_1.default, leaderboard_js_1.default,
    slots_js_1.default, blackjack_js_1.default, coinflip_js_1.default, dice_js_1.default, roulette_js_1.default,
    coinflip_duel_js_1.default, dice_duel_js_1.default, roulette_duel_js_1.default,
    shop_js_1.default, buy_js_1.default, inventory_js_1.default,
    setshop_js_1.default, addcoins_js_1.default, removecoins_js_1.default, additem_js_1.default, removeitem_js_1.default,
];
exports.allCommands = allCommands;
function loadCommands(collection) {
    for (const cmd of allCommands) {
        collection.set(cmd.data.name, cmd);
    }
    console.log(`📦  ${allCommands.length} commandes chargées`);
}
