import { readPersistentData, writePersistentData } from "@/lib/persistence";
import {
  FinanceClient,
  FinanceClientSummary,
  FinanceData,
  FinanceMonthlyPoint,
  FinanceRecord,
  FinanceRecordCategory,
  FinanceRecordType,
  FinanceSummary,
  MonthlyClientBreakdown,
  MonthlySnapshot,
} from "@/lib/finance-types";

export const FINANCE_FILE = "finance.json";

export const defaultFinanceData: FinanceData = {
  clients: [],
  records: [],
  monthlySnapshots: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return todayDate().slice(0, 7);
}

function toDate(value: unknown): string {
  if (typeof value !== "string") return todayDate();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return todayDate();
  return parsed.toISOString().slice(0, 10);
}

function toMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

function normalizeRecordType(value: unknown): FinanceRecordType {
  return value === "expense" ? "expense" : "income";
}

function normalizeCategory(value: unknown, fallbackType: FinanceRecordType): FinanceRecordCategory {
  if (
    value === "retainer" ||
    value === "ad spend" ||
    value === "tool cost" ||
    value === "freelancer" ||
    value === "other"
  ) {
    return value;
  }

  if (value === "revenue") return "other";
  if (value === "expense") return fallbackType === "expense" ? "other" : "retainer";
  return fallbackType === "income" ? "retainer" : "other";
}

function normalizeClient(raw: unknown): FinanceClient | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;

  return {
    id: raw.id.trim(),
    name: raw.name.trim(),
    status: raw.status === "paused" ? "paused" : "active",
  };
}

function normalizeFinanceRecord(raw: unknown): FinanceRecord | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;

  const type = normalizeRecordType(raw.type);
  const client = typeof raw.client === "string" && raw.client.trim() ? raw.client.trim() : null;
  const notes =
    typeof raw.notes === "string"
      ? raw.notes.trim()
      : typeof raw.description === "string"
        ? raw.description.trim()
        : "";

  return {
    id: raw.id.trim(),
    type,
    client,
    amount: Math.max(0, toNumber(raw.amount)),
    category: normalizeCategory(raw.category, type),
    date: toDate(raw.date),
    notes,
    recurring: Boolean(raw.recurring),
  };
}

function normalizeMonthlyClientBreakdown(raw: unknown, key: string): MonthlyClientBreakdown | null {
  if (!isRecord(raw)) return null;

  const clientId = typeof raw.clientId === "string" && raw.clientId.trim() ? raw.clientId.trim() : key;
  const clientName =
    typeof raw.clientName === "string" && raw.clientName.trim()
      ? raw.clientName.trim()
      : typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim()
        : key;

  return {
    clientId,
    clientName,
    revenue: Math.max(0, toNumber(raw.revenue)),
    costs: Math.max(0, toNumber(raw.costs)),
    monthlyRetainer: Math.max(0, toNumber(raw.monthlyRetainer)),
    adSpendManaged: Math.max(0, toNumber(raw.adSpendManaged ?? raw.adSpend)),
    additionalCosts: Math.max(0, toNumber(raw.additionalCosts)),
  };
}

function normalizeSnapshot(raw: unknown): MonthlySnapshot | null {
  if (!isRecord(raw) || typeof raw.month !== "string") return null;

  const breakdownSource = isRecord(raw.clientBreakdown) ? raw.clientBreakdown : {};
  const clientBreakdown = Object.fromEntries(
    Object.entries(breakdownSource)
      .map(([key, value]) => [key, normalizeMonthlyClientBreakdown(value, key)] as const)
      .filter((entry): entry is [string, MonthlyClientBreakdown] => entry[1] !== null),
  );

  const month = toMonthKey(raw.month);
  const totalRevenue = Math.max(0, toNumber(raw.totalRevenue));
  const totalCosts = Math.max(0, toNumber(raw.totalCosts));

  return {
    month,
    totalRevenue,
    totalCosts,
    netProfit: toNumber(raw.netProfit) || totalRevenue - totalCosts,
    clientBreakdown,
  };
}

function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function compareMonth(a: string, b: string) {
  return a.localeCompare(b);
}

function addMonths(month: string, offset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthBounds(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function isRecordActiveInMonth(record: FinanceRecord, month: string) {
  const monthStart = `${month}-01`;
  return record.recurring ? record.date <= monthStart : record.date.startsWith(month);
}

function createBreakdown(client: FinanceClient): MonthlyClientBreakdown {
  return {
    clientId: client.id,
    clientName: client.name,
    revenue: 0,
    costs: 0,
    monthlyRetainer: 0,
    adSpendManaged: 0,
    additionalCosts: 0,
  };
}

function createSnapshot(month: string, clients: FinanceClient[]): MonthlySnapshot {
  const clientBreakdown = Object.fromEntries(clients.map((client) => [client.name, createBreakdown(client)]));
  return {
    month,
    totalRevenue: 0,
    totalCosts: 0,
    netProfit: 0,
    clientBreakdown,
  };
}

function applyRecordToSnapshot(
  snapshot: MonthlySnapshot,
  record: FinanceRecord,
  clientMap: Map<string, FinanceClient>,
) {
  if (record.type === "income") {
    snapshot.totalRevenue += record.amount;
  } else {
    snapshot.totalCosts += record.amount;
  }

  if (!record.client) return;

  const client = clientMap.get(record.client);
  const key = client?.name ?? record.client;
  const existing =
    snapshot.clientBreakdown[key] ??
    ({
      clientId: record.client,
      clientName: client?.name ?? record.client,
      revenue: 0,
      costs: 0,
      monthlyRetainer: 0,
      adSpendManaged: 0,
      additionalCosts: 0,
    } satisfies MonthlyClientBreakdown);

  if (record.type === "income") {
    existing.revenue += record.amount;
    if (record.category === "retainer") existing.monthlyRetainer += record.amount;
  } else {
    existing.costs += record.amount;
    if (record.category === "ad spend") {
      existing.adSpendManaged += record.amount;
    } else {
      existing.additionalCosts += record.amount;
    }
  }

  snapshot.clientBreakdown[key] = existing;
}

function buildSnapshots(data: FinanceData): Record<string, MonthlySnapshot> {
  const months = new Set<string>([currentMonth(), ...Object.keys(data.monthlySnapshots)]);
  for (const record of data.records) {
    months.add(record.date.slice(0, 7));
    if (record.recurring) months.add(currentMonth());
  }

  const monthList = Array.from(months).sort(compareMonth);
  if (monthList.length === 0) monthList.push(currentMonth());

  const earliestMonth = monthList[0];
  const latestMonth = monthList[monthList.length - 1];
  const fullRange: string[] = [];
  let cursor = earliestMonth;
  while (compareMonth(cursor, latestMonth) <= 0) {
    fullRange.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  const clientMap = new Map(data.clients.map((client) => [client.id, client] as const));

  return Object.fromEntries(
    fullRange.map((month) => {
      const snapshot = createSnapshot(month, data.clients);
      for (const record of data.records) {
        if (isRecordActiveInMonth(record, month)) {
          applyRecordToSnapshot(snapshot, record, clientMap);
        }
      }
      snapshot.netProfit = snapshot.totalRevenue - snapshot.totalCosts;
      return [month, snapshot];
    }),
  );
}

function createLegacyRecords(raw: Record<string, unknown>): FinanceRecord[] {
  const month = currentMonth();
  const legacyClients = Array.isArray(raw.clients) ? raw.clients : [];
  const legacyEntries = Array.isArray(raw.entries) ? raw.entries : [];
  const overhead = isRecord(raw.monthlyOverhead) ? raw.monthlyOverhead : {};
  const records: FinanceRecord[] = [];

  for (const item of legacyClients) {
    if (!isRecord(item) || typeof item.id !== "string") continue;
    const clientId = item.id.trim();
    if (!clientId) continue;

    const monthlyRetainer = Math.max(0, toNumber(item.monthlyRetainer));
    const adSpend = Math.max(0, toNumber(item.adSpend));

    if (monthlyRetainer > 0) {
      records.push({
        id: `legacy-retainer-${clientId}`,
        type: "income",
        client: clientId,
        amount: monthlyRetainer,
        category: "retainer",
        date: `${month}-01`,
        notes: "Migrated monthly retainer",
        recurring: true,
      });
    }

    if (adSpend > 0) {
      records.push({
        id: `legacy-ad-spend-${clientId}`,
        type: "expense",
        client: clientId,
        amount: adSpend,
        category: "ad spend",
        date: `${month}-01`,
        notes: "Migrated ad spend",
        recurring: true,
      });
    }
  }

  const overheadMappings: Array<[string, FinanceRecordCategory, string]> = [
    ["aiCosts", "tool cost", "Migrated AI costs"],
    ["software", "tool cost", "Migrated software costs"],
    ["team", "freelancer", "Migrated team costs"],
    ["other", "other", "Migrated overhead"],
  ];

  for (const [field, category, notes] of overheadMappings) {
    const amount = Math.max(0, toNumber(overhead[field]));
    if (amount <= 0) continue;
    records.push({
      id: `legacy-overhead-${field}`,
      type: "expense",
      client: null,
      amount,
      category,
      date: `${month}-01`,
      notes,
      recurring: true,
    });
  }

  for (const item of legacyEntries) {
    if (!isRecord(item) || typeof item.id !== "string") continue;
    const legacyType = item.category === "expense" ? "expense" : "income";
    const client = typeof item.clientId === "string" && item.clientId.trim() ? item.clientId.trim() : null;

    records.push({
      id: item.id,
      type: legacyType,
      client,
      amount: Math.max(0, toNumber(item.amount)),
      category: "other",
      date: toDate(item.date),
      notes: typeof item.description === "string" ? item.description.trim() : "",
      recurring: false,
    });
  }

  return records;
}

function normalizeFinanceData(raw: unknown): FinanceData {
  if (!isRecord(raw)) return defaultFinanceData;

  const clients = Array.isArray(raw.clients)
    ? raw.clients.map(normalizeClient).filter((client): client is FinanceClient => client !== null)
    : [];

  const recordsSource =
    Array.isArray(raw.records) && raw.records.length > 0 ? raw.records : createLegacyRecords(raw);

  const recordMap = new Map<string, FinanceRecord>();
  for (const rawRecord of recordsSource) {
    const normalized = normalizeFinanceRecord(rawRecord);
    if (normalized) recordMap.set(normalized.id, normalized);
  }

  const records = Array.from(recordMap.values()).sort((left, right) => {
    const dateComparison = right.date.localeCompare(left.date);
    if (dateComparison !== 0) return dateComparison;
    return left.id.localeCompare(right.id);
  });

  const monthlySnapshotsSource = isRecord(raw.monthlySnapshots) ? raw.monthlySnapshots : {};
  const monthlySnapshots = Object.fromEntries(
    Object.entries(monthlySnapshotsSource)
      .map(([key, value]) => [key, normalizeSnapshot(value)] as const)
      .filter((entry): entry is [string, MonthlySnapshot] => entry[1] !== null),
  );

  const normalized: FinanceData = {
    clients,
    records,
    monthlySnapshots,
  };

  normalized.monthlySnapshots = buildSnapshots(normalized);
  return normalized;
}

export async function getFinanceData(): Promise<FinanceData> {
  const raw = await readPersistentData<unknown>(FINANCE_FILE, defaultFinanceData);
  const normalized = normalizeFinanceData(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await writePersistentData(FINANCE_FILE, normalized);
  }
  return normalized;
}

export async function writeFinanceData(data: FinanceData) {
  const normalized = normalizeFinanceData(data);
  await writePersistentData(FINANCE_FILE, normalized);
}

function getTransactionsForMonth(records: FinanceRecord[], month: string) {
  const bounds = getMonthBounds(month);
  return records
    .filter((record) => {
      if (!record.recurring) return record.date.startsWith(month);
      return record.date <= bounds.end;
    })
    .sort((left, right) => {
      const dateComparison = right.date.localeCompare(left.date);
      if (dateComparison !== 0) return dateComparison;
      return left.id.localeCompare(right.id);
    });
}

export function buildFinanceSummary(data: FinanceData, requestedMonth?: string): FinanceSummary {
  const selectedMonth = toMonthKey(requestedMonth ?? currentMonth());
  const availableMonths = Object.keys(data.monthlySnapshots).sort(compareMonth);
  const snapshot = data.monthlySnapshots[selectedMonth] ?? createSnapshot(selectedMonth, data.clients);
  const transactions = getTransactionsForMonth(data.records, selectedMonth);

  const clients: FinanceClientSummary[] = data.clients
    .map((client) => {
      const breakdown = Object.values(snapshot.clientBreakdown).find((item) => item.clientId === client.id) ?? createBreakdown(client);
      const netProfit = breakdown.revenue - breakdown.costs;
      const marginPercent = breakdown.revenue > 0 ? (netProfit / breakdown.revenue) * 100 : 0;
      return {
        clientId: client.id,
        name: client.name,
        status: client.status,
        monthlyRetainer: breakdown.monthlyRetainer,
        adSpendManaged: breakdown.adSpendManaged,
        additionalCosts: breakdown.additionalCosts,
        revenue: breakdown.revenue,
        costs: breakdown.costs,
        netProfit,
        marginPercent,
      };
    })
    .sort((left, right) => right.revenue - left.revenue || left.name.localeCompare(right.name));

  const trend: FinanceMonthlyPoint[] = Array.from({ length: 6 }, (_, index) => {
    const month = addMonths(selectedMonth, index - 5);
    const point = data.monthlySnapshots[month] ?? createSnapshot(month, data.clients);
    return {
      month,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(`${month}-01T00:00:00Z`)),
      revenue: point.totalRevenue,
      costs: point.totalCosts,
      profit: point.netProfit,
    };
  });

  const mrr = data.records
    .filter((record) => record.type === "income" && record.recurring && record.date <= `${selectedMonth}-31`)
    .reduce((sum, record) => sum + record.amount, 0);

  return {
    overall: {
      month: selectedMonth,
      monthLabel: monthLabel(selectedMonth),
      monthlyRevenue: snapshot.totalRevenue,
      monthlyCosts: snapshot.totalCosts,
      netProfit: snapshot.netProfit,
      mrr,
      activeClients: data.clients.filter((client) => client.status === "active").length,
    },
    clients,
    trend,
    transactions,
    availableMonths,
  };
}
