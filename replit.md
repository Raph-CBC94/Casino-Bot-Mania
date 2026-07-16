# Casino Discord Bot

Bot Discord casino complet — économie, mini-jeux solo & 1v1, boutique interactive, déployable sur Render.

## Run & Operate

- `cd bot && npm run dev` — lance le bot en mode développement (hot-reload)
- `cd bot && npm run build` — compile TypeScript → dist/
- `cd bot && npm run deploy` — (ré)enregistre les 20 slash commands auprès de Discord
- `cd bot && npm start` — lance le bot compilé (production)

## Variables d'environnement requises

- `DISCORD_TOKEN` — token du bot (onglet Bot du portail Discord)
- `CLIENT_ID` — Application ID (General Information)
- `GUILD_ID` — *(optionnel)* pour déploiement instantané des commandes sur un serveur
- `DB_PATH` — *(optionnel)* chemin vers le fichier SQLite (défaut: `bot/data/casino.db`)

## Stack

- **discord.js** v14 — slash commands, boutons interactifs, embeds
- **node:sqlite** — SQLite natif Node.js 24 (pas de compilation C++ requise)
- **TypeScript** 5.7 — typage complet
- **tsx** — hot-reload en développement

## Where things live

- `bot/src/index.ts` — point d'entrée, initialisation client Discord
- `bot/src/database/index.ts` — toutes les opérations SQLite (source of truth)
- `bot/src/commands/` — toutes les commandes slash organisées par dossier
- `bot/src/utils/` — helpers (économie, couleurs, shop message)
- `bot/scripts/deploy-commands.ts` — script d'enregistrement des commandes
- `render.yaml` — config déploiement Render (root du projet)

## Architecture decisions

- `node:sqlite` (Node.js 24 natif) à la place de `better-sqlite3` → zéro compilation native, compatible Render et Replit
- Client Discord exposé via singleton `src/client.ts` pour éviter les dépendances circulaires
- État des parties Blackjack en mémoire (Map) — pas besoin de persistance pour une partie < 5 min
- Duels (1v1) persistés en SQLite avec nettoyage auto toutes les 60s
- Message boutique persistant dans un salon Discord, mis à jour automatiquement à chaque changement d'article

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Après chaque changement de commande slash, relancer `npm run deploy`
- Les commandes globales Discord prennent jusqu'à 1h à apparaître — définir `GUILD_ID` pour test instantané
- Sur Render : disque persistant monté sur `/var/data`, DB_PATH=/var/data/casino.db
