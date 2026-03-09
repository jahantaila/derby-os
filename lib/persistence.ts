export const isKvConfigured = Boolean(process.env.KV_REST_API_URL);
const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

function keyFor(file: string) {
  return `mission-control:${file}`;
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (!kvUrl || !kvToken) return null;

  const res = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kvToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { result?: T | null };
  return body.result ?? null;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  if (!kvUrl || !kvToken) return;

  await fetch(`${kvUrl}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kvToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value }),
    cache: "no-store",
  });
}

export async function readPersistentData<T>(file: string, fallback: T): Promise<T> {
  if (!isKvConfigured) {
    return fallback;
  }

  try {
    const value = await kvGet<T>(keyFor(file));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function writePersistentData(file: string, data: unknown): Promise<void> {
  if (!isKvConfigured) {
    return;
  }

  await kvSet(keyFor(file), data);
}
