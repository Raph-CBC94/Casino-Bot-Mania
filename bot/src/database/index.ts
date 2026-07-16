// Using Node.js 24 built-in SQLite (no native compilation required)
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dbDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dbDir, 'casino.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id    TEXT NOT NULL,
    guild_id   TEXT NOT NULL,
    balance    INTEGER DEFAULT 1000,
    daily_last INTEGER DEFAULT 0,
    work_last  INTEGER DEFAULT 0,
    wins       INTEGER DEFAULT 0,
    losses     INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT DEFAULT 'Aucune description',
    price       INTEGER NOT NULL,
    role_id     TEXT,
    emoji       TEXT DEFAULT '🎁'
  );

  CREATE TABLE IF NOT EXISTS user_items (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    item_id  INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    UNIQUE(user_id, guild_id, item_id),
    FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id         TEXT PRIMARY KEY,
    shop_channel_id  TEXT,
    shop_message_id  TEXT
  );

  CREATE TABLE IF NOT EXISTS active_duels (
    id            TEXT PRIMARY KEY,
    challenger_id TEXT NOT NULL,
    challenged_id TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    channel_id    TEXT NOT NULL,
    game          TEXT NOT NULL,
    bet           INTEGER NOT NULL,
    data          TEXT DEFAULT '{}',
    status        TEXT DEFAULT 'pending',
    created_at    INTEGER DEFAULT (unixepoch())
  );
`);

// ─── User helpers ──────────────────────────────────────────────────────────────

export function getUser(userId: string, guildId: string): UserRow {
  db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId) as unknown as UserRow;
}

export function addBalance(userId: string, guildId: string, amount: number): void {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
}

export function addWin(userId: string, guildId: string): void {
  db.prepare('UPDATE users SET wins = wins + 1 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

export function addLoss(userId: string, guildId: string): void {
  db.prepare('UPDATE users SET losses = losses + 1 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

export function getLeaderboard(guildId: string, limit = 10): UserRow[] {
  return db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY balance DESC LIMIT ?').all(guildId, limit) as unknown as UserRow[];
}

// ─── Guild settings ────────────────────────────────────────────────────────────

export function getGuildSettings(guildId: string): GuildSettings | undefined {
  return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) as unknown as GuildSettings | undefined;
}

export function setGuildSettings(guildId: string, channelId: string, messageId: string): void {
  db.prepare(`
    INSERT INTO guild_settings (guild_id, shop_channel_id, shop_message_id)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET shop_channel_id = excluded.shop_channel_id, shop_message_id = excluded.shop_message_id
  `).run(guildId, channelId, messageId);
}

// ─── Shop helpers ──────────────────────────────────────────────────────────────

export function getShopItems(guildId: string): ShopItem[] {
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ?').all(guildId) as unknown as ShopItem[];
}

export function getShopItem(id: number, guildId: string): ShopItem | undefined {
  return db.prepare('SELECT * FROM shop_items WHERE id = ? AND guild_id = ?').get(id, guildId) as unknown as ShopItem | undefined;
}

export function addShopItem(
  guildId: string, name: string, description: string,
  price: number, roleId: string | null, emoji: string,
): { lastInsertRowid: number | bigint } {
  return db.prepare(
    'INSERT INTO shop_items (guild_id, name, description, price, role_id, emoji) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(guildId, name, description, price, roleId ?? null, emoji) as { lastInsertRowid: number | bigint };
}

export function removeShopItem(id: number, guildId: string): void {
  db.prepare('DELETE FROM shop_items WHERE id = ? AND guild_id = ?').run(id, guildId);
}

export function getUserItems(userId: string, guildId: string): (ShopItem & { quantity: number })[] {
  return db.prepare(`
    SELECT ui.quantity, si.* FROM user_items ui
    JOIN shop_items si ON ui.item_id = si.id
    WHERE ui.user_id = ? AND ui.guild_id = ?
  `).all(userId, guildId) as unknown as (ShopItem & { quantity: number })[];
}

export function addUserItem(userId: string, guildId: string, itemId: number): void {
  db.prepare(`
    INSERT INTO user_items (user_id, guild_id, item_id, quantity) VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, guild_id, item_id) DO UPDATE SET quantity = quantity + 1
  `).run(userId, guildId, itemId);
}

// ─── Duel helpers ──────────────────────────────────────────────────────────────

export function createDuel(
  id: string, challengerId: string, challengedId: string,
  guildId: string, channelId: string, game: string, bet: number,
): void {
  db.prepare(
    'INSERT INTO active_duels (id, challenger_id, challenged_id, guild_id, channel_id, game, bet) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, challengerId, challengedId, guildId, channelId, game, bet);
}

export function getDuel(id: string): DuelRow | undefined {
  return db.prepare('SELECT * FROM active_duels WHERE id = ?').get(id) as unknown as DuelRow | undefined;
}

export function updateDuelData(id: string, data: Record<string, unknown>): void {
  db.prepare('UPDATE active_duels SET data = ? WHERE id = ?').run(JSON.stringify(data), id);
}

export function deleteDuel(id: string): void {
  db.prepare('DELETE FROM active_duels WHERE id = ?').run(id);
}

export function cleanExpiredDuels(): void {
  db.prepare("DELETE FROM active_duels WHERE created_at < unixepoch() - 300").run();
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
  created_at: number;
}
