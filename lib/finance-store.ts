import { readData, writeData } from "@/lib/data";
import {
  FinanceCategory,
  FinanceClient,
  FinanceClientSummary,
  FinanceData,
  FinanceEntry,
  FinanceMonthlyPoint,
  FinanceSummary,
} from "@/lib/finance-types";

export const FINANCE_FILE = "finance.json";

export const defaultFinanceData: FinanceData = {
  clients: [
    { id: "bluegrass", name: "Bluegrass Garage Door", monthlyRetainer: 0, adSpend: 0, status: "active" },
    { id: "palma", name: "Palma Italian Kitchen", monthlyRetainer: 0, adSpend: 0, status: "active" },
    { id: "olympus", name: "OlympusLou", monthlyRetainer: 0, adSpend: 0, status: "active" },
  ],
  entries: [],
  monthlyOverhead: {
    aiCosts: 0,
    software: 0,
    team: 0,
    other: 0,
  },
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

function toDate(value: unknown): string {
  if (typeof value !== "string") return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeCategory(value: unknown): FinanceCategory {
  return value === "expense" ? "expense" : "revenue";
}

function normalizeClient(raw: unknown): FinanceClient | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.name !== "string" || !raw.name) return null;
  return {
    id: raw.id,
    name: raw.name,
    monthlyRetainer: toNumber(raw.monthlyRetainer),
    adSpend: toNumber(raw.adSpend),
    status: raw.status === "paused" ? "paused" : "active",
  };
}

function normalizeEntry(raw: unknown): FinanceEntry | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.description !== "string" || !raw.description.trim()) return null;

  const clientId = typeof raw.clientId === "string" && raw.clientId.trim() ? raw.clientId : null;
  return {
    id: raw.id,
    date: toDate(raw.date),
    description: raw.description.trim(),
    category: normalizeCategory(raw.category),
    clientId,
    amount: Math.max(0, toNumber(raw.amount)),
  };
}

function normalizeFinanceData(raw: unknown): FinanceData {
  if (!isRecord(raw)) return defaultFinanceData;

  const clients = Array.isArray(raw.clients)
    ? raw.clients.map(normalizeClient).filter((client): client is FinanceClient => client !== null)
    : [];

  const entries = Array.isArray(raw.entries)
    ? raw.entries.map(normalizeEntry).filter((entry): entry is FinanceEntry => entry !== null)
    : [];

  const overheadSource = isRecord(raw.monthlyOverhead) ? raw.monthlyOverhead : {};

  const data: FinanceData = {
    clients: clients.length > 0 ? clients : defaultFinanceData.clients,
    entries,
    monthlyOverhead: {
      aiCosts: toNumber(overheadSource.aiCosts),
      software: toNumber(overheadSource.software),
      team: toNumber(overheadSource.team),
      other: toNumber(overheadSource.other),
    },
  };

  return data;
}

export function getFinanceData(): FinanceData {
  const raw = readData<unknown>(FINANCE_FILE, defaultFinanceData);
  const normalized = normalizeFinanceData(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    writeFinanceData(normalized);
  }
  return normalized;
}

export function writeFinanceData(data: FinanceData) {
  const normalized = normalizeFinanceData(data);
  writeData(FINANCE_FILE, normalized);
}

export function buildFinanceSummary(data: FinanceData): FinanceSummary {
  const clientSummaries: FinanceClientSummary[] = data.clients.map((client) => {
    const revenueEntries = data.entries
      .filter((entry) => entry.clientId === client.id && entry.category === "revenue")
      .reduce((total, entry) => total + entry.amount, 0);

    const expenseEntries = data.entries
      .filter((entry) => entry.clientId === client.id && entry.category === "expense")
      .reduce((total, entry) => total + entry.amount, 0);

    const monthlyRetainer = client.monthlyRetainer + revenueEntries;
    const expenses = client.adSpend + expenseEntries;
    const profit = monthlyRetainer - expenses;
    const margin = monthlyRetainer > 0 ? (profit / monthlyRetainer) * 100 : 0;

    return {
      clientId: client.id,
      name: client.name,
      monthlyRetainer,
      adSpend: client.adSpend,
      expenses,
      profit,
      margin,
    };
  });

  const retainerRevenue = data.clients.reduce((sum, client) => sum + client.monthlyRetainer, 0);
  const adSpendTotal = data.clients.reduce((sum, client) => sum + client.adSpend, 0);
  const revenueEntries = data.entries
    .filter((entry) => entry.category === "revenue")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenseEntries = data.entries
    .filter((entry) => entry.category === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const overheadTotal = Object.values(data.monthlyOverhead).reduce((sum, value) => sum + value, 0);

  const monthlyRevenue = retainerRevenue + revenueEntries;
  const monthlyExpenses = adSpendTotal + overheadTotal + expenseEntries;
  const netProfit = monthlyRevenue - monthlyExpenses;
  const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;

  return {
    overall: {
      monthlyRevenue,
      monthlyExpenses,
      netProfit,
      profitMargin,
    },
    clients: clientSummaries,
    monthly: buildMonthlySeries(data),
  };
}

function buildMonthlySeries(data: FinanceData): FinanceMonthlyPoint[] {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const now = new Date();
  const monthlyBaseRevenue = data.clients.reduce((sum, client) => sum + client.monthlyRetainer, 0);
  const monthlyBaseExpenses =
    data.clients.reduce((sum, client) => sum + client.adSpend, 0) +
    Object.values(data.monthlyOverhead).reduce((sum, value) => sum + value, 0);

  const points: FinanceMonthlyPoint[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

    const entryRevenue = data.entries
      .filter((entry) => entry.category === "revenue" && entry.date.startsWith(monthKey))
      .reduce((sum, entry) => sum + entry.amount, 0);

    const entryExpenses = data.entries
      .filter((entry) => entry.category === "expense" && entry.date.startsWith(monthKey))
      .reduce((sum, entry) => sum + entry.amount, 0);

    points.push({
      monthKey,
      label: `${formatter.format(date)} ${String(year).slice(-2)}`,
      revenue: monthlyBaseRevenue + entryRevenue,
      expenses: monthlyBaseExpenses + entryExpenses,
    });
  }

  return points;
}
