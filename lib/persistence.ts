import { createClient, type RedisClientType } from "redis";

export const isKvConfigured = Boolean(process.env.REDIS_URL);

let _client: RedisClientType | null = null;

async function getClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;
  if (_client?.isOpen) return _client;

  try {
    _client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    _client.on("error", () => {});
    await _client.connect();
    return _client;
  } catch {
    _client = null;
    return null;
  }
}

function keyFor(file: string) {
  return `mission-control:${file}`;
}

export async function readPersistentData<T>(file: string, fallback: T): Promise<T> {
  const client = await getClient();
  if (!client) return fallback;

  try {
    const raw = await client.get(keyFor(file));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writePersistentData(file: string, data: unknown): Promise<void> {
  const client = await getClient();
  if (!client) return;

  await client.set(keyFor(file), JSON.stringify(data));
}
