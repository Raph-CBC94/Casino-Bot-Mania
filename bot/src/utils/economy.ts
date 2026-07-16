export function formatBalance(amount: number): string {
  return `**${amount.toLocaleString('fr-FR')} 🪙**`;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chance(percent: number): boolean {
  return Math.random() * 100 < percent;
}

export function generateDuelId(): string {
  return `duel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const DAILY_AMOUNT  = 500;
export const DAILY_COOLDOWN = 86400; // 24h in seconds
export const WORK_COOLDOWN  = 3600;  // 1h in seconds
export const WORK_MIN       = 50;
export const WORK_MAX       = 300;
export const STARTING_BALANCE = 1000;
