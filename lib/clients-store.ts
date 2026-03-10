import { readPersistentData, writePersistentData } from "@/lib/persistence";
import { getFinanceData } from "@/lib/finance-store";
import { CLIENT_TYPE_OPTIONS, ClientProfile, ClientService, ClientStatus, ClientType, SERVICE_OPTIONS } from "@/lib/client-types";

const CLIENTS_FILE = "clients";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toStatus(value: unknown): ClientStatus {
  if (value === "inactive") return "inactive";
  if (value === "paused") return "paused";
  return "active";
}

function toClientType(value: unknown): ClientType {
  if (typeof value !== "string") return "other";
  return (CLIENT_TYPE_OPTIONS as readonly string[]).includes(value) ? (value as ClientType) : "other";
}

function toServices(value: unknown): ClientService[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<string>(SERVICE_OPTIONS);
  const next = value
    .map((item) => toString(item))
    .filter((item): item is ClientService => valid.has(item));
  return Array.from(new Set(next));
}

function normalizeClient(raw: unknown): ClientProfile | null {
  if (!isRecord(raw)) return null;
  const id = toString(raw.id);
  const name = toString(raw.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    clientType: toClientType(raw.clientType),
    contactName: toString(raw.contactName) || undefined,
    email: toString(raw.email) || undefined,
    phone: toString(raw.phone) || undefined,
    website: toString(raw.website) || undefined,
    address: toString(raw.address) || undefined,
    services: toServices(raw.services),
    monthlyRetainer: Math.max(0, toNumber(raw.monthlyRetainer)),
    monthlyBudgetRange:
      raw.monthlyBudgetRange === "Under $500" ||
      raw.monthlyBudgetRange === "$500-$1k" ||
      raw.monthlyBudgetRange === "$1k-$2k" ||
      raw.monthlyBudgetRange === "$2k-$5k" ||
      raw.monthlyBudgetRange === "$5k+"
        ? raw.monthlyBudgetRange
        : undefined,
    startDate: toString(raw.startDate) || undefined,
    status: toStatus(raw.status),
    notes: toString(raw.notes) || undefined,
    createdAt: toString(raw.createdAt) || new Date().toISOString(),
  };
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function sortClients(clients: ClientProfile[]) {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name));
}

function mergeWithFinanceClients(existing: ClientProfile[], financeClients: Awaited<ReturnType<typeof getFinanceData>>["clients"]): ClientProfile[] {
  const byId = new Map(existing.map((client) => [client.id, client]));
  const month = currentMonthKey();

  for (const financeClient of financeClients) {
    const currentRevenue = (financeClient.months[month]?.income ?? []).reduce((sum, row) => sum + row.amount, 0);
    const existingClient = byId.get(financeClient.id);

    if (!existingClient) {
      byId.set(financeClient.id, {
        id: financeClient.id,
        name: financeClient.name,
        clientType: financeClient.clientType,
        services: [],
        monthlyRetainer: currentRevenue,
        status: "active",
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    if (existingClient.name !== financeClient.name) {
      byId.set(financeClient.id, { ...existingClient, name: financeClient.name, clientType: financeClient.clientType });
    }
  }

  return sortClients(Array.from(byId.values()));
}

export async function getClients(): Promise<ClientProfile[]> {
  const [storedRaw, finance] = await Promise.all([
    readPersistentData<unknown>(CLIENTS_FILE, []),
    getFinanceData(),
  ]);

  const stored = Array.isArray(storedRaw)
    ? storedRaw.map(normalizeClient).filter((client): client is ClientProfile => client !== null)
    : [];

  const merged = mergeWithFinanceClients(stored, finance.clients);

  if (JSON.stringify(stored) !== JSON.stringify(merged)) {
    await writePersistentData(CLIENTS_FILE, merged);
  }

  return merged;
}

export async function writeClients(data: ClientProfile[]): Promise<void> {
  const normalized = data.map(normalizeClient).filter((client): client is ClientProfile => client !== null);
  await writePersistentData(CLIENTS_FILE, sortClients(normalized));
}

export async function upsertClient(client: ClientProfile): Promise<ClientProfile[]> {
  const normalized = normalizeClient(client);
  if (!normalized) throw new Error("Invalid client profile");

  const clients = await getClients();
  const existingIndex = clients.findIndex((entry) => entry.id === normalized.id);
  const next = [...clients];

  if (existingIndex >= 0) {
    next[existingIndex] = {
      ...next[existingIndex],
      ...normalized,
      createdAt: next[existingIndex].createdAt,
    };
  } else {
    next.push(normalized);
  }

  await writeClients(next);
  return getClients();
}

export async function deleteClientProfile(id: string): Promise<ClientProfile[]> {
  const clients = await getClients();
  const next = clients.filter((entry) => entry.id !== id);
  await writeClients(next);
  return getClients();
}
