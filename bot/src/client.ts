import { Client } from 'discord.js';

let _client: Client | null = null;

export function setClient(c: Client): void {
  _client = c;
}

export function getClient(): Client {
  if (!_client) throw new Error('Client not initialized yet');
  return _client;
}
