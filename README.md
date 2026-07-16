# 🎰 Casino Discord Bot

Bot Discord casino complet avec mini-jeux solo & 1v1, système économique et boutique.

## 🎮 Commandes

### 💰 Économie
| Commande | Description |
|---|---|
| `/balance [@user]` | Affiche ton solde et tes stats |
| `/daily` | Réclame tes 500 🪙 quotidiens |
| `/work` | Travaille pour 50-300 🪙 (cooldown 1h) |
| `/leaderboard` | Top 10 des joueurs les plus riches |

### 🎲 Mini-jeux Solo
| Commande | Description |
|---|---|
| `/slots <mise>` | 🎰 Machine à sous — jackpot ×50 ! |
| `/blackjack <mise>` | 🃏 Blackjack contre le dealer (avec boutons) |
| `/coinflip <mise> <pile/face>` | 🪙 Pile ou Face — ×2 |
| `/dice <mise> <chiffre>` | 🎲 Devine le dé — ×5 si exact |
| `/roulette <mise> <type>` | 🎡 Roulette européenne |

### ⚔️ Duels 1v1
| Commande | Description |
|---|---|
| `/duel-coinflip @user <mise>` | 🪙 Duel Pile ou Face |
| `/duel-dice @user <mise>` | 🎲 Duel Dés — le plus haut gagne |
| `/duel-roulette @user <mise> <couleur>` | 🎡 Duel Roulette |

### 🛒 Boutique
| Commande | Description |
|---|---|
| `/shop` | Affiche la boutique |
| `/buy <id>` | Achète un article |
| `/inventory` | Affiche ton inventaire |

### 🔧 Admin (ManageGuild requis)
| Commande | Description |
|---|---|
| `/setshop #salon` | Publie la boutique interactive dans un salon |
| `/addcoins @user <montant>` | Ajoute des pièces |
| `/removecoins @user <montant>` | Retire des pièces |
| `/additem <nom> <prix> [desc] [role] [emoji]` | Ajoute un article |
| `/removeitem <id>` | Supprime un article |

## 🚀 Installation & Déploiement

### 1. Créer le bot Discord

1. Va sur [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → donne-lui un nom
3. Onglet **Bot** → **Reset Token** → copie le token
4. Active les **Privileged Gateway Intents** : `Server Members Intent`
5. Onglet **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Bot Permissions : `Manage Roles`, `Send Messages`, `Embed Links`, `Read Messages/View Channels`
   - Copie et ouvre le lien pour inviter le bot

### 2. Variables d'environnement

Copie `.env.example` en `.env` et remplis :
```env
DISCORD_TOKEN=ton_token
CLIENT_ID=ton_client_id
GUILD_ID=ton_server_id  # Pour test instantané
```

`CLIENT_ID` = onglet **General Information** → Application ID

### 3. Installer et lancer en local

```bash
cd bot
npm install
npm run deploy    # Enregistre les slash commands
npm run dev       # Lance en mode développement
```

### 4. Déploiement sur Render

1. Push ce repo sur GitHub
2. Sur [render.com](https://render.com) : **New → Blueprint** → sélectionne ton repo
3. Render lit le `render.yaml` automatiquement
4. Configure les variables d'environnement dans Render :
   - `DISCORD_TOKEN` : token du bot
   - `CLIENT_ID` : application ID
5. Le disque persistant `/var/data` sauvegarde la base de données SQLite

**Avant le premier déploiement** : lance `npm run deploy` en local pour enregistrer les commandes slash.

## ⚙️ Stack

- **discord.js** v14 — slash commands, boutons, embeds
- **better-sqlite3** — base de données SQLite synchrone
- **TypeScript** — typage complet
- **Render** — hébergement via `render.yaml`
