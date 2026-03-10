import { readPersistentData, writePersistentData } from "@/lib/persistence";
import {
  ExpenseCategory,
  FinanceData,
  FinanceEmployeeExpense,
  FinanceMonthData,
  FinanceOneTimeExpense,
  FinanceRecurringExpense,
  FinanceRevenue,
  FinanceSummary,
  RevenueCategory,
} from "@/lib/finance-types";

export const FINANCE_FILE = "finance.json";
export const MARCH_2026 = "2026-03";
const DEFAULT_GOAL = 15000;

function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

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

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toMonthKey(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) return value;
  return currentMonth();
}

function toExpenseCategory(value: unknown): ExpenseCategory {
  return value === "fulfillment" || value === "marketing" || value === "hosting" || value === "other" ? value : "other";
}

function toRevenueCategory(value: unknown): RevenueCategory {
  return value === "retainer" || value === "project" || value === "ad management" || value === "other" ? value : "other";
}

function toId(value: unknown, prefix: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeRecurringExpense(raw: unknown): FinanceRecurringExpense | null {
  if (!isRecord(raw)) return null;
  const name = toString(raw.name);
  if (!name) return null;

  return {
    id: toId(raw.id, "recur"),
    name,
    date: toString(raw.date),
    type: toExpenseCategory(raw.type),
    recurring: toString(raw.recurring) || "M",
    notes: toString(raw.notes),
    price: Math.max(0, toNumber(raw.price)),
  };
}

function normalizeEmployeeExpense(raw: unknown): FinanceEmployeeExpense | null {
  if (!isRecord(raw)) return null;
  const name = toString(raw.name);
  if (!name) return null;

  return {
    id: toId(raw.id, "employee"),
    name,
    date: toString(raw.date),
    notes: toString(raw.notes),
    price: Math.max(0, toNumber(raw.price)),
    extraNotes: toString(raw.extraNotes),
  };
}

function normalizeOneTimeExpense(raw: unknown): FinanceOneTimeExpense | null {
  if (!isRecord(raw)) return null;
  const name = toString(raw.name);
  if (!name) return null;

  return {
    id: toId(raw.id, "onetime"),
    name,
    date: toString(raw.date),
    notes: toString(raw.notes),
    price: Math.max(0, toNumber(raw.price)),
  };
}

function normalizeRevenue(raw: unknown): FinanceRevenue | null {
  if (!isRecord(raw)) return null;
  const clientName = toString(raw.clientName);
  if (!clientName) return null;

  const stripeFeeRaw = raw.stripeFee;
  const stripeFee = stripeFeeRaw === null || stripeFeeRaw === "" ? null : Math.max(0, toNumber(stripeFeeRaw));

  return {
    id: toId(raw.id, "revenue"),
    clientName,
    amount: Math.max(0, toNumber(raw.amount)),
    date: toString(raw.date),
    type: toRevenueCategory(raw.type),
    notes: toString(raw.notes),
    stripeFee,
  };
}

function emptyMonth(month: string): FinanceMonthData {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    recurringExpenses: [],
    employeeExpenses: [],
    oneTimeExpenses: [],
    revenues: [],
  };
}

function normalizeMonthData(raw: unknown, monthKey: string): FinanceMonthData {
  if (!isRecord(raw)) return emptyMonth(monthKey);

  const recurringExpenses = Array.isArray(raw.recurringExpenses)
    ? raw.recurringExpenses.map(normalizeRecurringExpense).filter((item): item is FinanceRecurringExpense => item !== null)
    : [];

  const employeeExpenses = Array.isArray(raw.employeeExpenses)
    ? raw.employeeExpenses.map(normalizeEmployeeExpense).filter((item): item is FinanceEmployeeExpense => item !== null)
    : [];

  const oneTimeExpenses = Array.isArray(raw.oneTimeExpenses)
    ? raw.oneTimeExpenses.map(normalizeOneTimeExpense).filter((item): item is FinanceOneTimeExpense => item !== null)
    : [];

  const revenues = Array.isArray(raw.revenues)
    ? raw.revenues.map(normalizeRevenue).filter((item): item is FinanceRevenue => item !== null)
    : [];

  return {
    month: toMonthKey(raw.month ?? monthKey),
    goalAmount: Math.max(0, toNumber(raw.goalAmount || DEFAULT_GOAL)),
    recurringExpenses,
    employeeExpenses,
    oneTimeExpenses,
    revenues,
  };
}

function mapLegacyCategory(value: unknown): ExpenseCategory {
  if (value === "ad spend") return "marketing";
  if (value === "tool cost") return "fulfillment";
  if (value === "freelancer") return "fulfillment";
  return "other";
}

function migrateLegacyData(raw: Record<string, unknown>): FinanceData {
  const months: Record<string, FinanceMonthData> = {};
  const records = Array.isArray(raw.records) ? raw.records : [];

  for (const record of records) {
    if (!isRecord(record)) continue;
    const date = toString(record.date);
    const month = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : currentMonth();
    const monthData = months[month] ?? emptyMonth(month);
    const id = toId(record.id, "legacy");
    const notes = toString(record.notes);
    const amount = Math.max(0, toNumber(record.amount));

    if (record.type === "income") {
      monthData.revenues.push({
        id,
        clientName: toString(record.client) || "Unknown Client",
        amount,
        date,
        type: "other",
        notes,
        stripeFee: null,
      });
    } else if (record.recurring) {
      monthData.recurringExpenses.push({
        id,
        name: notes || "Migrated recurring expense",
        date,
        type: mapLegacyCategory(record.category),
        recurring: "M",
        notes,
        price: amount,
      });
    } else {
      monthData.oneTimeExpenses.push({
        id,
        name: notes || "Migrated one-time expense",
        date,
        notes,
        price: amount,
      });
    }

    months[month] = monthData;
  }

  if (Object.keys(months).length === 0) {
    months[MARCH_2026] = seedMarch2026();
  }

  return { months };
}

function normalizeFinanceData(raw: unknown): FinanceData {
  if (!isRecord(raw)) {
    return { months: { [MARCH_2026]: seedMarch2026() } };
  }

  if (!isRecord(raw.months)) {
    return migrateLegacyData(raw);
  }

  const months = Object.fromEntries(
    Object.entries(raw.months)
      .filter(([month]) => /^\d{4}-\d{2}$/.test(month))
      .map(([month, value]) => [month, normalizeMonthData(value, month)]),
  );

  if (Object.keys(months).length === 0) {
    months[MARCH_2026] = seedMarch2026();
  }

  return { months };
}

function seededRecurringExpenses(): FinanceRecurringExpense[] {
  return [
    { id: crypto.randomUUID(), name: "Google Account", date: "first of every month", type: "other", recurring: "M", notes: "gmail + biz accounts", price: 50.4 },
    { id: crypto.randomUUID(), name: "Cloudways", date: "8th of every month", type: "fulfillment", recurring: "M", notes: "for sites", price: 54.5 },
    { id: crypto.randomUUID(), name: "Canva Premium", date: "10th of every month", type: "fulfillment", recurring: "M", notes: "", price: 7.95 },
    { id: crypto.randomUUID(), name: "Instantly Emails x9", date: "15th of every month", type: "marketing", recurring: "M", notes: "pre warmed accounts", price: 45 },
    { id: crypto.randomUUID(), name: "Instantly Monthly x10", date: "15th of every month", type: "marketing", recurring: "M", notes: "pre warmed accounts", price: 100 },
    { id: crypto.randomUUID(), name: "Instantly Subscription", date: "16th of every month", type: "marketing", recurring: "M", notes: "basic tier plan", price: 97 },
    { id: crypto.randomUUID(), name: "Envato Elements", date: "17th of every month", type: "fulfillment", recurring: "M", notes: "", price: 41.34 },
    { id: crypto.randomUUID(), name: "Captions.ai", date: "18th of every month", type: "fulfillment", recurring: "M", notes: "pro plan", price: 10.59 },
    { id: crypto.randomUUID(), name: "Framer Hosting", date: "25th of every month", type: "hosting", recurring: "M", notes: "derby digital site", price: 20 },
    { id: crypto.randomUUID(), name: "GoHighLevel", date: "28th of every month", type: "fulfillment", recurring: "M", notes: "", price: 297 },
    { id: crypto.randomUUID(), name: "Allgood Prime Site", date: "29th of every month", type: "fulfillment", recurring: "M", notes: "framer hosting", price: 10 },
    { id: crypto.randomUUID(), name: "Claude Max", date: "3rd of every month", type: "fulfillment", recurring: "M", notes: "openclaw", price: 200 },
    { id: crypto.randomUUID(), name: "Webild.io", date: "8th of every month", type: "fulfillment", recurring: "M", notes: "", price: 12 },
  ];
}

function seededEmployeeExpenses(): FinanceEmployeeExpense[] {
  return [
    { id: crypto.randomUUID(), name: "Abdul Salary", date: "first of every month", notes: "extra $100 for chino", price: 500.48, extraNotes: "Subject To Change" },
    { id: crypto.randomUUID(), name: "Elang Salary", date: "first of every month", notes: "", price: 350, extraNotes: "Subject To Change" },
    { id: crypto.randomUUID(), name: "Muhammad Salary", date: "22nd of every month", notes: "", price: 400, extraNotes: "$800 split between me & Allgood" },
    { id: crypto.randomUUID(), name: "Manu Commission", date: "first of every month", notes: "502 thrifts, todays man, 502 snkr plug", price: 630.06, extraNotes: "Subject To Change" },
    { id: crypto.randomUUID(), name: "Sharvil Commission", date: "first of every month", notes: "$40 for little angels and $100 for Claude Code", price: 140, extraNotes: "Subject To Change" },
    { id: crypto.randomUUID(), name: "Allgood Commission", date: "staggered throughout the month", notes: "25% presumed commission", price: 74.86, extraNotes: "Subject To Change" },
    { id: crypto.randomUUID(), name: "Hammas Sites", date: "staggered throughout the month", notes: "$300 for derby city pizza, $300 for capital tire & muffler", price: 600, extraNotes: "" },
  ];
}

function seedMarch2026(): FinanceMonthData {
  return {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    recurringExpenses: seededRecurringExpenses(),
    employeeExpenses: seededEmployeeExpenses(),
    oneTimeExpenses: [],
    revenues: [],
  };
}

function getMonthData(data: FinanceData, month: string): FinanceMonthData {
  return data.months[month] ?? emptyMonth(month);
}

export function buildFinanceSummary(data: FinanceData, requestedMonth?: string): FinanceSummary {
  const month = toMonthKey(requestedMonth ?? currentMonth());
  const monthData = getMonthData(data, month);

  const grossRevenue = monthData.revenues.reduce((sum, row) => sum + row.amount, 0);
  const totalStripeFee = monthData.revenues.reduce((sum, row) => sum + (row.stripeFee ?? row.amount * 0.03), 0);
  const totalRecurringExpenditure = monthData.recurringExpenses.reduce((sum, row) => sum + row.price, 0);
  const totalEmployeeExpenditure = monthData.employeeExpenses.reduce((sum, row) => sum + row.price, 0);
  const totalOneTimeExpenditure = monthData.oneTimeExpenses.reduce((sum, row) => sum + row.price, 0);
  const totalExpenditure = totalRecurringExpenditure + totalEmployeeExpenditure + totalOneTimeExpenditure;
  const totalProfit = grossRevenue - totalExpenditure;
  const profitMargin = grossRevenue > 0 ? (totalProfit / grossRevenue) * 100 : 0;
  const goalPercent = monthData.goalAmount > 0 ? (totalProfit / monthData.goalAmount) * 100 : 0;

  return {
    month,
    monthLabel: monthLabel(month),
    grossRevenue,
    totalStripeFee,
    totalRecurringExpenditure,
    totalEmployeeExpenditure,
    totalOneTimeExpenditure,
    totalExpenditure,
    totalProfit,
    profitMargin,
    goalAmount: monthData.goalAmount,
    goalPercent,
  };
}

export async function getFinanceData(): Promise<FinanceData> {
  const raw = await readPersistentData<unknown>(FINANCE_FILE, { months: { [MARCH_2026]: seedMarch2026() } });
  const normalized = normalizeFinanceData(raw);

  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await writePersistentData(FINANCE_FILE, normalized);
  }

  return normalized;
}

export async function writeFinanceData(data: FinanceData): Promise<void> {
  const normalized = normalizeFinanceData(data);
  await writePersistentData(FINANCE_FILE, normalized);
}
