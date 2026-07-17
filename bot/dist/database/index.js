"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.getUser = getUser;
exports.addBalance = addBalance;
exports.addWin = addWin;
exports.addLoss = addLoss;
exports.setDailyLast = setDailyLast;
exports.setWorkLast = setWorkLast;
exports.getLeaderboard = getLeaderboard;
exports.getGuildSettings = getGuildSettings;
exports.setGuildSettings = setGuildSettings;
exports.getShopItems = getShopItems;
exports.getShopItem = getShopItem;
exports.addShopItem = addShopItem;
exports.removeShopItem = removeShopItem;
exports.getUserItems = getUserItems;
exports.addUserItem = addUserItem;
exports.createDuel = createDuel;
exports.getDuel = getDuel;
exports.updateDuelData = updateDuelData;
exports.deleteDuel = deleteDuel;
exports.cleanExpiredDuels = cleanExpiredDuels;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('❌  SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
});
// ─── User helpers ──────────────────────────────────────────────────────────────
async function getUser(userId, guildId) {
    const { data, error } = await exports.supabase.rpc('ensure_user', { p_user_id: userId, p_guild_id: guildId });
    if (error)
        throw new Error(`getUser: ${error.message}`);
    return data[0];
}
async function addBalance(userId, guildId, amount) {
    const { error } = await exports.supabase.rpc('increment_balance', { p_user_id: userId, p_guild_id: guildId, p_amount: amount });
    if (error)
        throw new Error(`addBalance: ${error.message}`);
}
async function addWin(userId, guildId) {
    await exports.supabase.rpc('add_win', { p_user_id: userId, p_guild_id: guildId });
}
async function addLoss(userId, guildId) {
    await exports.supabase.rpc('add_loss', { p_user_id: userId, p_guild_id: guildId });
}
async function setDailyLast(userId, guildId, timestamp) {
    await exports.supabase.from('users')
        .update({ daily_last: timestamp })
        .eq('user_id', userId).eq('guild_id', guildId);
}
async function setWorkLast(userId, guildId, timestamp) {
    await exports.supabase.from('users')
        .update({ work_last: timestamp })
        .eq('user_id', userId).eq('guild_id', guildId);
}
async function getLeaderboard(guildId, limit = 10) {
    const { data } = await exports.supabase
        .from('users').select('*').eq('guild_id', guildId)
        .order('balance', { ascending: false }).limit(limit);
    return (data ?? []);
}
// ─── Guild settings ────────────────────────────────────────────────────────────
async function getGuildSettings(guildId) {
    const { data } = await exports.supabase.from('guild_settings').select('*').eq('guild_id', guildId).maybeSingle();
    return data;
}
async function setGuildSettings(guildId, channelId, messageId) {
    await exports.supabase.from('guild_settings').upsert({ guild_id: guildId, shop_channel_id: channelId, shop_message_id: messageId }, { onConflict: 'guild_id' });
}
// ─── Shop helpers ──────────────────────────────────────────────────────────────
async function getShopItems(guildId) {
    const { data } = await exports.supabase.from('shop_items').select('*').eq('guild_id', guildId).order('id');
    return (data ?? []);
}
async function getShopItem(id, guildId) {
    const { data } = await exports.supabase.from('shop_items').select('*').eq('id', id).eq('guild_id', guildId).maybeSingle();
    return data;
}
async function addShopItem(guildId, name, description, price, roleId, emoji) {
    const { data, error } = await exports.supabase
        .from('shop_items')
        .insert({ guild_id: guildId, name, description, price, role_id: roleId, emoji })
        .select('id').single();
    if (error || !data)
        throw new Error(`addShopItem: ${error?.message}`);
    return Number(data.id);
}
async function removeShopItem(id, guildId) {
    await exports.supabase.from('shop_items').delete().eq('id', id).eq('guild_id', guildId);
}
async function getUserItems(userId, guildId) {
    const { data } = await exports.supabase
        .from('user_items')
        .select('quantity, shop_items(*)')
        .eq('user_id', userId)
        .eq('guild_id', guildId);
    if (!data)
        return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row) => ({ ...row.shop_items, quantity: row.quantity }));
}
async function addUserItem(userId, guildId, itemId) {
    await exports.supabase.rpc('add_user_item', { p_user_id: userId, p_guild_id: guildId, p_item_id: itemId });
}
// ─── Duel helpers ──────────────────────────────────────────────────────────────
async function createDuel(id, challengerId, challengedId, guildId, channelId, game, bet) {
    await exports.supabase.from('active_duels').insert({ id, challenger_id: challengerId, challenged_id: challengedId, guild_id: guildId, channel_id: channelId, game, bet });
}
async function getDuel(id) {
    const { data } = await exports.supabase.from('active_duels').select('*').eq('id', id).maybeSingle();
    return data;
}
async function updateDuelData(id, data) {
    await exports.supabase.from('active_duels').update({ data: JSON.stringify(data) }).eq('id', id);
}
async function deleteDuel(id) {
    await exports.supabase.from('active_duels').delete().eq('id', id);
}
async function cleanExpiredDuels() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await exports.supabase.from('active_duels').delete().lt('created_at', fiveMinutesAgo);
}
