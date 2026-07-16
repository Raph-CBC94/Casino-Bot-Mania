import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌  SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// ─── User helpers ──────────────────────────────────────────────────────────────

export async function getUser(userId: string, guildId: string): Promise<UserRow> {
  const { data, error } = await supabase.rpc('ensure_user', { p_user_id: userId, p_guild_id: guildId });
  if (error) throw new Error(`getUser: ${error.message}`);
  return (data as UserRow[])[0];
}

export async function addBalance(userId: string, guildId: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('increment_balance', { p_user_id: userId, p_guild_id: guildId, p_amount: amount });
  if (error) throw new Error(`addBalance: ${error.message}`);
}

export async function addWin(userId: string, guildId: string): Promise<void> {
  await supabase.rpc('add_win', { p_user_id: userId, p_guild_id: guildId });
}

export async function addLoss(userId: string, guildId: string): Promise<void> {
  await supabase.rpc('add_loss', { p_user_id: userId, p_guild_id: guildId });
}

export async function setDailyLast(userId: string, guildId: string, timestamp: number): Promise<void> {
  await supabase.from('users')
    .update({ daily_last: timestamp })
    .eq('user_id', userId).eq('guild_id', guildId);
}

export async function setWorkLast(userId: string, guildId: string, timestamp: number): Promise<void> {
  await supabase.from('users')
    .update({ work_last: timestamp })
    .eq('user_id', userId).eq('guild_id', guildId);
}

export async function getLeaderboard(guildId: string, limit = 10): Promise<UserRow[]> {
  const { data } = await supabase
    .from('users').select('*').eq('guild_id', guildId)
    .order('balance', { ascending: false }).limit(limit);
  return (data ?? []) as UserRow[];
}

// ─── Guild settings ────────────────────────────────────────────────────────────

export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  const { data } = await supabase.from('guild_settings').select('*').eq('guild_id', guildId).maybeSingle();
  return data as GuildSettings | null;
}

export async function setGuildSettings(guildId: string, channelId: string, messageId: string): Promise<void> {
  await supabase.from('guild_settings').upsert(
    { guild_id: guildId, shop_channel_id: channelId, shop_message_id: messageId },
    { onConflict: 'guild_id' },
  );
}

// ─── Shop helpers ──────────────────────────────────────────────────────────────

export async function getShopItems(guildId: string): Promise<ShopItem[]> {
  const { data } = await supabase.from('shop_items').select('*').eq('guild_id', guildId).order('id');
  return (data ?? []) as ShopItem[];
}

export async function getShopItem(id: number, guildId: string): Promise<ShopItem | null> {
  const { data } = await supabase.from('shop_items').select('*').eq('id', id).eq('guild_id', guildId).maybeSingle();
  return data as ShopItem | null;
}

export async function addShopItem(
  guildId: string, name: string, description: string,
  price: number, roleId: string | null, emoji: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('shop_items')
    .insert({ guild_id: guildId, name, description, price, role_id: roleId, emoji })
    .select('id').single();
  if (error || !data) throw new Error(`addShopItem: ${error?.message}`);
  return Number(data.id);
}

export async function removeShopItem(id: number, guildId: string): Promise<void> {
  await supabase.from('shop_items').delete().eq('id', id).eq('guild_id', guildId);
}

export async function getUserItems(userId: string, guildId: string): Promise<(ShopItem & { quantity: number })[]> {
  const { data } = await supabase
    .from('user_items')
    .select('quantity, shop_items(*)')
    .eq('user_id', userId)
    .eq('guild_id', guildId);
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({ ...row.shop_items, quantity: row.quantity }));
}

export async function addUserItem(userId: string, guildId: string, itemId: number): Promise<void> {
  await supabase.rpc('add_user_item', { p_user_id: userId, p_guild_id: guildId, p_item_id: itemId });
}

// ─── Duel helpers ──────────────────────────────────────────────────────────────

export async function createDuel(
  id: string, challengerId: string, challengedId: string,
  guildId: string, channelId: string, game: string, bet: number,
): Promise<void> {
  await supabase.from('active_duels').insert(
    { id, challenger_id: challengerId, challenged_id: challengedId, guild_id: guildId, channel_id: channelId, game, bet },
  );
}

export async function getDuel(id: string): Promise<DuelRow | null> {
  const { data } = await supabase.from('active_duels').select('*').eq('id', id).maybeSingle();
  return data as DuelRow | null;
}

export async function updateDuelData(id: string, data: Record<string, unknown>): Promise<void> {
  await supabase.from('active_duels').update({ data: JSON.stringify(data) }).eq('id', id);
}

export async function deleteDuel(id: string): Promise<void> {
  await supabase.from('active_duels').delete().eq('id', id);
}

export async function cleanExpiredDuels(): Promise<void> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase.from('active_duels').delete().lt('created_at', fiveMinutesAgo);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface UserRow {
  user_id: string;
  guild_id: string;
  balance: number;
  daily_last: number;
  work_last: number;
  wins: number;
  losses: number;
}

export interface ShopItem {
  id: number;
  guild_id: string;
  name: string;
  description: string;
  price: number;
  role_id: string | null;
  emoji: string;
}

export interface GuildSettings {
  guild_id: string;
  shop_channel_id: string | null;
  shop_message_id: string | null;
}

export interface DuelRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  guild_id: string;
  channel_id: string;
  game: string;
  bet: number;
  data: string;
  status: string;
  created_at: string;
}
