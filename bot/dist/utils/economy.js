"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARTING_BALANCE = exports.WORK_MAX = exports.WORK_MIN = exports.WORK_COOLDOWN = exports.DAILY_COOLDOWN = exports.DAILY_AMOUNT = void 0;
exports.formatBalance = formatBalance;
exports.randomInt = randomInt;
exports.chance = chance;
exports.generateDuelId = generateDuelId;
function formatBalance(amount) {
    return `**${amount.toLocaleString('fr-FR')} 🪙**`;
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(percent) {
    return Math.random() * 100 < percent;
}
function generateDuelId() {
    return `duel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
exports.DAILY_AMOUNT = 500;
exports.DAILY_COOLDOWN = 86400; // 24h in seconds
exports.WORK_COOLDOWN = 3600; // 1h in seconds
exports.WORK_MIN = 50;
exports.WORK_MAX = 300;
exports.STARTING_BALANCE = 1000;
