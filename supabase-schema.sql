-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  Casino Discord Bot — Schéma Supabase v2                               │
-- │  Colle l'intégralité de ce fichier dans l'éditeur SQL de Supabase      │
-- │  et clique sur "Run". Idempotent — peut être rejoué sans danger.        │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Utilisateurs & économie
CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT    NOT NULL,
  guild_id   TEXT    NOT NULL,
  balance    INTEGER NOT NULL DEFAULT 1000,
  daily_last BIGINT  NOT NULL DEFAULT 0,
  work_last  BIGINT  NOT NULL DEFAULT 0,
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, guild_id)
);

-- Articles de la boutique (avec effets gameplay)
CREATE TABLE IF NOT EXISTS shop_items (
  id              BIGSERIAL PRIMARY KEY,
  guild_id        TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT 'Aucune description',
  price           INTEGER NOT NULL,
  role_id         TEXT,
  emoji           TEXT    NOT NULL DEFAULT '🎁',
  effect_type     TEXT,
  effect_value    NUMERIC NOT NULL DEFAULT 1,
  effect_duration INTEGER NOT NULL DEFAULT 86400
);

-- Colonnes manquantes pour les mises à jour (idempotent)
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS effect_type     TEXT;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS effect_value    NUMERIC  NOT NULL DEFAULT 1;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS effect_duration INTEGER  NOT NULL DEFAULT 86400;

-- Inventaires joueurs
CREATE TABLE IF NOT EXISTS user_items (
  id       BIGSERIAL PRIMARY KEY,
  user_id  TEXT   NOT NULL,
  guild_id TEXT   NOT NULL,
  item_id  BIGINT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, guild_id, item_id)
);

-- Effets actifs (boost achetés en boutique)
CREATE TABLE IF NOT EXISTS active_effects (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  guild_id    TEXT        NOT NULL,
  effect_type TEXT        NOT NULL,
  value       NUMERIC     NOT NULL DEFAULT 1,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paramètres par serveur
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id                TEXT PRIMARY KEY,
  shop_channel_id         TEXT,
  shop_message_id         TEXT,
  leaderboard_channel_id  TEXT,
  leaderboard_message_id  TEXT
);

ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS leaderboard_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS leaderboard_message_id TEXT;

-- Duels 1v1 actifs
CREATE TABLE IF NOT EXISTS active_duels (
  id            TEXT        PRIMARY KEY,
  challenger_id TEXT        NOT NULL,
  challenged_id TEXT        NOT NULL,
  guild_id      TEXT        NOT NULL,
  channel_id    TEXT        NOT NULL,
  game          TEXT        NOT NULL,
  bet           INTEGER     NOT NULL,
  data          TEXT        NOT NULL DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Fonctions RPC ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION ensure_user(p_user_id TEXT, p_guild_id TEXT)
RETURNS SETOF users LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO users (user_id, guild_id)
  VALUES (p_user_id, p_guild_id)
  ON CONFLICT (user_id, guild_id) DO NOTHING;
  RETURN QUERY SELECT * FROM users WHERE user_id = p_user_id AND guild_id = p_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_balance(p_user_id TEXT, p_guild_id TEXT, p_amount INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET balance = balance + p_amount WHERE user_id = p_user_id AND guild_id = p_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION add_win(p_user_id TEXT, p_guild_id TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET wins = wins + 1 WHERE user_id = p_user_id AND guild_id = p_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION add_loss(p_user_id TEXT, p_guild_id TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET losses = losses + 1 WHERE user_id = p_user_id AND guild_id = p_guild_id;
END;
$$;

CREATE OR REPLACE FUNCTION add_user_item(p_user_id TEXT, p_guild_id TEXT, p_item_id BIGINT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_items (user_id, guild_id, item_id, quantity)
  VALUES (p_user_id, p_guild_id, p_item_id, 1)
  ON CONFLICT (user_id, guild_id, item_id) DO UPDATE SET quantity = user_items.quantity + 1;
END;
$$;

-- Index pour les effets actifs (performances)
CREATE INDEX IF NOT EXISTS idx_active_effects_user ON active_effects(user_id, guild_id, effect_type);
CREATE INDEX IF NOT EXISTS idx_active_effects_expires ON active_effects(expires_at);
