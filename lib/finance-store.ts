import { readPersistentData, writePersistentData } from "@/lib/persistence";
import {
  FinanceClient,
  FinanceClientStatus,
  FinanceClientType,
  FinanceData,
  FinanceGeneralMonthData,
  FinanceIncomeRow,
  FinanceLedgerRow,
  FinanceMonthData,
  FinanceServiceType,
  FinanceSummary,
} from "@/lib/finance-types";

export const FINANCE_FILE = "finance";
export const MARCH_2026 = "2026-03";
const DEFAULT_GOAL = 15000;

const FINANCE_SERVICES: readonly FinanceServiceType[] = [
  "Website",
  "SEO",
  "Social Media",
  "Google Ads",
  "Meta Ads",
  "Software",
  "Review Automation",
  "Other",
] as const;

const CLIENT_TYPES: readonly FinanceClientType[] = ["restaurant", "home-service", "gaming", "other"] as const;
const CLIENT_STATUSES: readonly FinanceClientStatus[] = ["active", "inactive"] as const;

const RESTAURANT_CLIENTS = new Set([
  "Al Forno",
  "El Vaquero",
  "Pina Fiesta",
  "El Mañanero",
  "Hop Atomica",
  "Las Chamas",
  "Suri Sushi Thai",
  "Hela-do Feliz",
  "BS Brew Works",
  "Bella Napoli Pizzeria",
  "May Fly",
  "Palma Italian + Jack",
  "Tuscany Italian",
]);

const HOME_SERVICE_CLIENTS = new Set([
  "Chamberlain Painting",
  "Lake Reliable Services",
  "Roofing KY",
  "Hardwire Electric",
  "Asgari Home Services",
]);

const GAMING_CLIENTS = new Set(["Olympus Gaming"]);

const SEEDED_CLIENT_NAMES = [
  "Hop Atomica",
  "Tuscany Italian",
  "Chamberlain Painting",
  "Al Forno",
  "El Vaquero",
  "Pina Fiesta",
  "Las Chamas",
  "Palma Italian + Jack",
  "Lake Reliable Services",
  "BS Brew Works",
  "Bella Napoli Pizzeria",
  "Suri Sushi Thai",
  "May Fly",
  "El Mañanero",
  "Hela-do Feliz",
  "Ghost Face Brewing",
  "Roofing KY",
  "Service Station",
  "Olympus Gaming",
  "Asgari Home Services",
  "Asgari Enterprise",
  "Hardwire Electric",
] as const;

const SEEDED_CLIENT_SERVICES: Partial<Record<(typeof SEEDED_CLIENT_NAMES)[number], FinanceServiceType[]>> = {
  "Hop Atomica": ["Website", "SEO", "Software", "Social Media", "Review Automation"],
  "Tuscany Italian": ["Website", "SEO", "Social Media"],
  "Chamberlain Painting": ["Website", "SEO", "Google Ads"],
  "Al Forno": ["Website", "SEO"],
  "El Vaquero": ["Website", "SEO"],
  "Pina Fiesta": ["Website", "SEO"],
  "Las Chamas": ["Website", "SEO"],
  "Palma Italian + Jack": ["Website", "SEO", "Social Media"],
  "Lake Reliable Services": ["Website", "Google Ads", "Meta Ads"],
  "BS Brew Works": ["Website", "SEO"],
  "Bella Napoli Pizzeria": ["Website", "SEO"],
  "Suri Sushi Thai": ["Website", "SEO"],
  "May Fly": ["Website", "SEO"],
  "El Mañanero": ["Social Media"],
  "Hela-do Feliz": ["Social Media"],
  "Roofing KY": ["Google Ads", "Website"],
  "Service Station": ["Other"],
  "Olympus Gaming": ["Software", "Other"],
  "Asgari Home Services": ["Website", "Google Ads"],
  "Asgari Enterprise": ["Other"],
  "Hardwire Electric": ["Website", "Google Ads"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 2, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
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

function toId(value: unknown, prefix: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return `${prefix}-${crypto.randomUUID()}`;
}

function toRecurring(value: unknown): "M" | "1-time" {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "m" || normalized === "monthly") return "M";
    if (normalized === "1-time" || normalized === "one-time" || normalized === "1 time" || normalized === "one time") {
      return "1-time";
    }
  }
  return "1-time";
}

function seededClientType(name: string): FinanceClientType {
  if (RESTAURANT_CLIENTS.has(name)) return "restaurant";
  if (HOME_SERVICE_CLIENTS.has(name)) return "home-service";
  if (GAMING_CLIENTS.has(name)) return "gaming";
  return "other";
}

function toClientType(value: unknown, fallbackName: string): FinanceClientType {
  if (typeof value === "string" && (CLIENT_TYPES as readonly string[]).includes(value)) {
    return value as FinanceClientType;
  }
  return seededClientType(fallbackName);
}

function toClientStatus(value: unknown): FinanceClientStatus {
  if (typeof value === "string" && (CLIENT_STATUSES as readonly string[]).includes(value)) {
    return value as FinanceClientStatus;
  }
  return "active";
}

function inferService(value: string): FinanceServiceType {
  const normalized = value.toLowerCase();
  if (normalized.includes("review")) return "Review Automation";
  if (normalized.includes("software") || normalized.includes("saas")) return "Software";
  if (normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) return "Meta Ads";
  if (normalized.includes("google") || normalized.includes("ppc")) return "Google Ads";
  if (normalized.includes("social")) return "Social Media";
  if (normalized.includes("seo")) return "SEO";
  if (normalized.includes("website") || normalized.includes("site") || normalized.includes("hosting")) return "Website";
  return "Other";
}

function toService(value: unknown, fallback: string): FinanceServiceType {
  if (typeof value === "string" && (FINANCE_SERVICES as readonly string[]).includes(value)) {
    return value as FinanceServiceType;
  }
  return inferService(fallback);
}

function toServices(value: unknown, fallbackName: string): FinanceServiceType[] {
  if (Array.isArray(value)) {
    const valid = new Set<string>(FINANCE_SERVICES);
    const services = value
      .map((item) => toString(item))
      .filter((service): service is FinanceServiceType => valid.has(service));
    if (services.length > 0) return Array.from(new Set(services));
  }

  const seeded = SEEDED_CLIENT_SERVICES[fallbackName as (typeof SEEDED_CLIENT_NAMES)[number]];
  if (seeded && seeded.length > 0) return seeded;
  return ["Other"];
}

function toPaymentStatus(value: unknown): "paid" | "pending" {
  if (value === "pending") return "pending";
  return "paid";
}

function normalizeLedgerRow(raw: unknown, prefix: string): FinanceLedgerRow | null {
  if (!isRecord(raw)) return null;
  const name = toString(raw.name);
  const date = toString(raw.date);
  const notes = toString(raw.notes);
  const recurring = toRecurring(raw.recurring);
  const amount = Math.max(0, toNumber(raw.amount ?? raw.price));
  const hasRecurringValue = typeof raw.recurring === "string" && raw.recurring.trim().length > 0;
  const hasMeaningfulContent = name.length > 0 || date.length > 0 || notes.length > 0 || amount > 0 || hasRecurringValue;

  // Keep intentionally blank rows when they already have an id (freshly added UI rows),
  // but drop fully empty anonymous objects from malformed payloads.
  if (!hasMeaningfulContent && typeof raw.id !== "string") return null;

  const serviceContext = `${name} ${notes}`.trim();

  return {
    id: toId(raw.id, prefix),
    name,
    date,
    recurring,
    notes,
    amount,
    service: toService(raw.service, serviceContext),
    paymentStatus: toPaymentStatus(raw.paymentStatus),
  };
}

function emptyClientMonth(month: string): FinanceMonthData {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [],
    expenses: [],
  };
}

function emptyGeneralMonth(month: string): FinanceGeneralMonthData {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    recurringExpenses: [],
    employeeExpenses: [],
    oneTimeExpenses: [],
  };
}

function cloneRecurringLedgerRows(rows: FinanceLedgerRow[]): FinanceLedgerRow[] {
  return rows
    .filter((row) => row.recurring === "M")
    .map((row) => ({
      id: crypto.randomUUID(),
      name: row.name,
      date: row.date,
      recurring: row.recurring,
      notes: row.notes,
      amount: row.amount,
      service: row.service,
      paymentStatus: row.paymentStatus,
    }));
}

function cloneRecurringIncomeRows(rows: FinanceIncomeRow[]): FinanceIncomeRow[] {
  return rows
    .filter((row) => row.recurring === "M")
    .map((row) => ({
      id: crypto.randomUUID(),
      name: row.name,
      date: row.date,
      recurring: row.recurring,
      notes: row.notes,
      amount: row.amount,
      service: row.service,
      paymentStatus: row.paymentStatus,
    }));
}

function ensureClientMonthWithCarry(client: FinanceClient, month: string): FinanceMonthData {
  const existing = client.months[month];
  if (existing) return existing;

  const prev = client.months[previousMonth(month)];
  const next = emptyClientMonth(month);
  if (!prev) return next;

  next.goalAmount = prev.goalAmount;
  next.income = cloneRecurringIncomeRows(prev.income);
  next.expenses = cloneRecurringLedgerRows(prev.expenses);
  return next;
}

function ensureGeneralMonthWithCarry(generalData: FinanceData["generalData"], month: string): FinanceGeneralMonthData {
  const existing = generalData.months[month];
  if (existing) return existing;

  const prev = generalData.months[previousMonth(month)];
  const next = emptyGeneralMonth(month);
  if (!prev) return next;

  next.goalAmount = prev.goalAmount;
  next.recurringExpenses = cloneRecurringLedgerRows(prev.recurringExpenses);
  next.employeeExpenses = cloneRecurringLedgerRows(prev.employeeExpenses);
  next.oneTimeExpenses = [];
  return next;
}

function normalizeClientMonth(raw: unknown, month: string): FinanceMonthData {
  if (!isRecord(raw)) return emptyClientMonth(month);

  const income = Array.isArray(raw.income)
    ? raw.income.map((row) => normalizeLedgerRow(row, "income")).filter((row): row is FinanceIncomeRow => row !== null)
    : [];

  const expenses = Array.isArray(raw.expenses)
    ? raw.expenses.map((row) => normalizeLedgerRow(row, "expense")).filter((row): row is FinanceLedgerRow => row !== null)
    : [];

  return {
    month: toMonthKey(raw.month ?? month),
    goalAmount: Math.max(0, toNumber(raw.goalAmount || DEFAULT_GOAL)),
    stripeFeeOverride:
      raw.stripeFeeOverride === null || raw.stripeFeeOverride === ""
        ? null
        : Math.max(0, toNumber(raw.stripeFeeOverride)),
    income,
    expenses,
  };
}

function normalizeGeneralMonth(raw: unknown, month: string): FinanceGeneralMonthData {
  if (!isRecord(raw)) return emptyGeneralMonth(month);

  const recurringExpenses = Array.isArray(raw.recurringExpenses)
    ? raw.recurringExpenses.map((row) => normalizeLedgerRow(row, "general-recurring")).filter((row): row is FinanceLedgerRow => row !== null)
    : [];

  const employeeExpenses = Array.isArray(raw.employeeExpenses)
    ? raw.employeeExpenses.map((row) => normalizeLedgerRow(row, "general-employee")).filter((row): row is FinanceLedgerRow => row !== null)
    : [];

  const oneTimeExpenses = Array.isArray(raw.oneTimeExpenses)
    ? raw.oneTimeExpenses.map((row) => normalizeLedgerRow(row, "general-onetime")).filter((row): row is FinanceLedgerRow => row !== null)
    : [];

  return {
    month: toMonthKey(raw.month ?? month),
    goalAmount: Math.max(0, toNumber(raw.goalAmount || DEFAULT_GOAL)),
    recurringExpenses,
    employeeExpenses,
    oneTimeExpenses,
  };
}

function emptyClient(name: string): FinanceClient {
  return {
    id: crypto.randomUUID(),
    name,
    clientType: seededClientType(name),
    status: "active",
    services: toServices([], name),
    months: {},
  };
}

function seededIncome(name: string, amount: number, notes = "Monthly retainer", service?: FinanceServiceType): FinanceIncomeRow {
  return {
    id: crypto.randomUUID(),
    name,
    date: "2026-03-01",
    recurring: "M",
    notes,
    amount,
    service: service ?? inferService(`${name} ${notes}`),
    paymentStatus: "paid",
  };
}

function seededExpense(name: string, amount: number): FinanceLedgerRow {
  return {
    id: crypto.randomUUID(),
    name,
    date: "2026-03-01",
    recurring: "M",
    notes: "",
    amount,
    service: inferService(name),
    paymentStatus: "paid",
  };
}

function seededGeneralRecurringExpenses(): FinanceLedgerRow[] {
  return [
    { id: crypto.randomUUID(), name: "Google Account", date: "first of every month", recurring: "M", notes: "gmail + biz accounts", amount: 50.4, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Cloudways", date: "8th of every month", recurring: "M", notes: "for sites", amount: 54.5, service: "Website", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Canva Premium", date: "10th of every month", recurring: "M", notes: "", amount: 7.95, service: "Social Media", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Instantly Emails x9", date: "15th of every month", recurring: "M", notes: "pre warmed accounts", amount: 45, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Instantly Monthly x10", date: "15th of every month", recurring: "M", notes: "pre warmed accounts", amount: 100, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Instantly Subscription", date: "16th of every month", recurring: "M", notes: "basic tier plan", amount: 97, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Envato Elements", date: "17th of every month", recurring: "M", notes: "", amount: 41.34, service: "Website", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Captions.ai", date: "18th of every month", recurring: "M", notes: "pro plan", amount: 10.59, service: "Social Media", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Framer Hosting", date: "25th of every month", recurring: "M", notes: "derby digital site", amount: 20, service: "Website", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "GoHighLevel", date: "28th of every month", recurring: "M", notes: "", amount: 297, service: "Software", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Allgood Prime Site", date: "29th of every month", recurring: "M", notes: "framer hosting", amount: 10, service: "Website", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Claude Max", date: "3rd of every month", recurring: "M", notes: "openclaw", amount: 200, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Webild.io", date: "8th of every month", recurring: "M", notes: "", amount: 12, service: "Other", paymentStatus: "paid" },
  ];
}

function seededGeneralEmployeeExpenses(): FinanceLedgerRow[] {
  return [
    { id: crypto.randomUUID(), name: "Abdul Salary", date: "first of every month", recurring: "M", notes: "extra $100 for chino", amount: 500.48, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Elang Salary", date: "first of every month", recurring: "M", notes: "", amount: 350, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Muhammad Salary", date: "22nd of every month", recurring: "M", notes: "", amount: 400, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Manu Commission", date: "first of every month", recurring: "M", notes: "502 thrifts, todays man, 502 snkr plug", amount: 630.06, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Sharvil Commission", date: "first of every month", recurring: "M", notes: "$40 for little angels and $100 for Claude Code", amount: 140, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Allgood Commission", date: "staggered throughout the month", recurring: "M", notes: "25% presumed commission", amount: 74.86, service: "Other", paymentStatus: "paid" },
    { id: crypto.randomUUID(), name: "Hammas Sites", date: "staggered throughout the month", recurring: "M", notes: "$300 for derby city pizza, $300 for capital tire & muffler", amount: 600, service: "Website", paymentStatus: "paid" },
  ];
}

function seedMarch2026Data(): FinanceData {
  const clients = SEEDED_CLIENT_NAMES.map((name) => emptyClient(name));
  const byName = new Map(clients.map((client) => [client.name, client]));

  byName.get("Hop Atomica")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [
      seededIncome("Google review automation", 67, "Monthly retainer", "Review Automation"),
      seededIncome("Website, SEO, software, social media", 280, "Monthly retainer", "Website"),
    ],
    expenses: [],
  };
  byName.get("Tuscany Italian")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 799, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Chamberlain Painting")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 750, "Monthly retainer", "Google Ads")],
    expenses: [seededExpense("Hosting", 20)],
  };
  byName.get("Al Forno")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 280, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("El Vaquero")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 280, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Pina Fiesta")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 280, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Las Chamas")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 280, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Palma Italian + Jack")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 338.3, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Lake Reliable Services")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 299, "Monthly retainer", "Google Ads")],
    expenses: [],
  };
  byName.get("BS Brew Works")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 199, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Bella Napoli Pizzeria")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 199, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("Suri Sushi Thai")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 199, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("May Fly")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 199, "Monthly retainer", "Website")],
    expenses: [],
  };
  byName.get("El Mañanero")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 84.15, "Monthly retainer", "Social Media")],
    expenses: [],
  };
  byName.get("Hela-do Feliz")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [seededIncome("Monthly retainer", 84.15, "Monthly retainer", "Social Media")],
    expenses: [],
  };

  byName.get("Ghost Face Brewing")!.months[MARCH_2026] = emptyClientMonth(MARCH_2026);
  byName.get("Roofing KY")!.months[MARCH_2026] = emptyClientMonth(MARCH_2026);
  byName.get("Service Station")!.months[MARCH_2026] = emptyClientMonth(MARCH_2026);
  byName.get("Olympus Gaming")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [],
    expenses: [seededExpense("Hosting", 20)],
  };
  byName.get("Asgari Home Services")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [],
    expenses: [seededExpense("Hosting", 20)],
  };
  byName.get("Asgari Enterprise")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [],
    expenses: [seededExpense("Hosting", 10)],
  };
  byName.get("Hardwire Electric")!.months[MARCH_2026] = {
    month: MARCH_2026,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [],
    expenses: [seededExpense("Hosting", 51.8)],
  };

  return {
    clients,
    generalData: {
      months: {
        [MARCH_2026]: {
          month: MARCH_2026,
          goalAmount: DEFAULT_GOAL,
          recurringExpenses: seededGeneralRecurringExpenses(),
          employeeExpenses: seededGeneralEmployeeExpenses(),
          oneTimeExpenses: [],
        },
      },
    },
  };
}

function ensureClientMetadata(client: FinanceClient): FinanceClient {
  const inferredServices = client.services.length > 0
    ? client.services
    : toServices([], client.name);

  return {
    ...client,
    clientType: client.clientType ?? seededClientType(client.name),
    status: client.status ?? "active",
    services: inferredServices,
  };
}

function normalizedClientsWithSeed(clients: FinanceClient[]): FinanceClient[] {
  const byName = new Map(clients.map((client) => [client.name.toLowerCase(), ensureClientMetadata(client)]));
  for (const name of SEEDED_CLIENT_NAMES) {
    if (!byName.has(name.toLowerCase())) {
      const created = emptyClient(name);
      byName.set(name.toLowerCase(), created);
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeClient(raw: unknown): FinanceClient | null {
  if (!isRecord(raw)) return null;
  const name = toString(raw.name);
  if (!name) return null;

  const monthsRaw = isRecord(raw.months) ? raw.months : {};
  const months: Record<string, FinanceMonthData> = {};

  for (const [month, monthValue] of Object.entries(monthsRaw)) {
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    months[month] = normalizeClientMonth(monthValue, month);
  }

  return {
    id: toId(raw.id, "client"),
    name,
    clientType: toClientType(raw.clientType, name),
    status: toClientStatus(raw.status),
    services: toServices(raw.services, name),
    months,
  };
}

function normalizeGeneralData(raw: unknown): FinanceData["generalData"] {
  if (!isRecord(raw) || !isRecord(raw.months)) {
    return { months: { [MARCH_2026]: emptyGeneralMonth(MARCH_2026) } };
  }

  const months = Object.fromEntries(
    Object.entries(raw.months)
      .filter(([month]) => /^\d{4}-\d{2}$/.test(month))
      .map(([month, monthValue]) => [month, normalizeGeneralMonth(monthValue, month)]),
  );

  if (Object.keys(months).length === 0) {
    months[MARCH_2026] = emptyGeneralMonth(MARCH_2026);
  }

  return { months };
}

function migrateLegacyData(raw: Record<string, unknown>): FinanceData {
  const seeded = seedMarch2026Data();

  if (!isRecord(raw.months)) {
    return seeded;
  }

  const clients = seeded.clients;
  const byName = new Map(clients.map((client) => [client.name.toLowerCase(), client]));

  for (const [month, monthRaw] of Object.entries(raw.months)) {
    if (!/^\d{4}-\d{2}$/.test(month) || !isRecord(monthRaw)) continue;

    const recurringExpenses = Array.isArray(monthRaw.recurringExpenses)
      ? monthRaw.recurringExpenses.map((row) => normalizeLedgerRow(row, "legacy-general-recurring")).filter((row): row is FinanceLedgerRow => row !== null)
      : [];

    const employeeExpenses = Array.isArray(monthRaw.employeeExpenses)
      ? monthRaw.employeeExpenses.map((row) => normalizeLedgerRow(row, "legacy-general-employee")).filter((row): row is FinanceLedgerRow => row !== null)
      : [];

    const oneTimeExpenses = Array.isArray(monthRaw.oneTimeExpenses)
      ? monthRaw.oneTimeExpenses.map((row) => normalizeLedgerRow(row, "legacy-general-onetime")).filter((row): row is FinanceLedgerRow => row !== null)
      : [];

    seeded.generalData.months[month] = {
      month,
      goalAmount: Math.max(0, toNumber(monthRaw.goalAmount || DEFAULT_GOAL)),
      recurringExpenses,
      employeeExpenses,
      oneTimeExpenses,
    };

    const revenues = Array.isArray(monthRaw.revenues) ? monthRaw.revenues : [];
    for (const revenueRaw of revenues) {
      if (!isRecord(revenueRaw)) continue;
      const clientName = toString(revenueRaw.clientName);
      if (!clientName) continue;

      const key = clientName.toLowerCase();
      const existingClient = byName.get(key) ?? (() => {
        const created = emptyClient(clientName);
        clients.push(created);
        byName.set(key, created);
        return created;
      })();

      const currentMonthData = existingClient.months[month] ?? emptyClientMonth(month);
      const incomeRow = normalizeLedgerRow(
        {
          id: revenueRaw.id,
          name: toString(revenueRaw.notes) || "Migrated income",
          date: toString(revenueRaw.date),
          recurring: "1-time",
          notes: toString(revenueRaw.notes),
          amount: toNumber(revenueRaw.amount),
          paymentStatus: "paid",
        },
        "legacy-income",
      );

      if (incomeRow) {
        currentMonthData.income.push(incomeRow);
        existingClient.months[month] = currentMonthData;
      }
    }
  }

  return {
    clients: normalizedClientsWithSeed(clients),
    generalData: seeded.generalData,
  };
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function scaleRows(rows: FinanceLedgerRow[], factor: number, month: string): FinanceLedgerRow[] {
  const [year, monthNum] = month.split("-");
  const syntheticDate = `${year}-${monthNum}-01`;

  return rows
    .filter((row) => row.amount > 0)
    .map((row) => ({
      ...row,
      id: crypto.randomUUID(),
      date: syntheticDate,
      amount: roundMoney(row.amount * factor),
      paymentStatus: "paid",
    }));
}

function ensureHistoricalPlaceholders(data: FinanceData): FinanceData {
  const placeholders: Array<{ month: string; factor: number }> = [
    { month: "2026-01", factor: 0.78 },
    { month: "2026-02", factor: 0.9 },
  ];

  const next: FinanceData = {
    clients: data.clients.map((client) => ({ ...client, months: { ...client.months } })),
    generalData: {
      months: { ...data.generalData.months },
    },
  };

  const baseGeneral = next.generalData.months[MARCH_2026];

  for (const item of placeholders) {
    if (!next.generalData.months[item.month]) {
      next.generalData.months[item.month] = baseGeneral
        ? {
            month: item.month,
            goalAmount: baseGeneral.goalAmount,
            recurringExpenses: scaleRows(baseGeneral.recurringExpenses, item.factor, item.month),
            employeeExpenses: scaleRows(baseGeneral.employeeExpenses, item.factor, item.month),
            oneTimeExpenses: [],
          }
        : emptyGeneralMonth(item.month);
    }

    for (const client of next.clients) {
      if (client.months[item.month]) continue;
      const baseMonth = client.months[MARCH_2026];
      client.months[item.month] = baseMonth
        ? {
            month: item.month,
            goalAmount: baseMonth.goalAmount,
            stripeFeeOverride: null,
            income: scaleRows(baseMonth.income, item.factor, item.month),
            expenses: scaleRows(baseMonth.expenses, item.factor, item.month),
          }
        : emptyClientMonth(item.month);
    }
  }

  return next;
}

function normalizeFinanceData(raw: unknown): FinanceData {
  if (!isRecord(raw)) {
    return ensureHistoricalPlaceholders(seedMarch2026Data());
  }

  if (!Array.isArray(raw.clients) || !isRecord(raw.generalData)) {
    return ensureHistoricalPlaceholders(migrateLegacyData(raw));
  }

  const clients = raw.clients.map(normalizeClient).filter((client): client is FinanceClient => client !== null);
  const normalizedClients = normalizedClientsWithSeed(clients);
  const generalData = normalizeGeneralData(raw.generalData);

  if (!generalData.months[MARCH_2026]) {
    generalData.months[MARCH_2026] = emptyGeneralMonth(MARCH_2026);
  }

  return ensureHistoricalPlaceholders({
    clients: normalizedClients,
    generalData,
  });
}

export function buildFinanceSummary(data: FinanceData, requestedMonth?: string): FinanceSummary {
  const month = toMonthKey(requestedMonth ?? currentMonth());
  const clients = data.clients.map((client) => ensureClientMonthWithCarry(client, month));
  const generalMonth = ensureGeneralMonthWithCarry(data.generalData, month);

  const grossRevenue = clients.reduce((sum, monthData) => sum + monthData.income.reduce((x, row) => x + row.amount, 0), 0);
  const totalStripeFee = clients.reduce((sum, monthData) => {
    if (monthData.stripeFeeOverride !== null) return sum + monthData.stripeFeeOverride;
    return sum + monthData.income.reduce((x, row) => x + row.amount * 0.03, 0);
  }, 0);

  const clientExpenses = clients.reduce((sum, monthData) => sum + monthData.expenses.reduce((rowSum, row) => rowSum + row.amount, 0), 0);

  const totalExpenditure =
    clientExpenses +
    generalMonth.recurringExpenses.reduce((sum, row) => sum + row.amount, 0) +
    generalMonth.employeeExpenses.reduce((sum, row) => sum + row.amount, 0) +
    generalMonth.oneTimeExpenses.reduce((sum, row) => sum + row.amount, 0);

  const totalProfit = grossRevenue - totalStripeFee - totalExpenditure;
  const profitMargin = grossRevenue > 0 ? (totalProfit / grossRevenue) * 100 : 0;

  return {
    month,
    monthLabel: monthLabel(month),
    grossRevenue,
    totalStripeFee,
    totalExpenditure,
    totalProfit,
    profitMargin,
  };
}

export function ensureMonth(data: FinanceData, month: string): FinanceData {
  const next: FinanceData = {
    clients: data.clients.map((client) => {
      const months = { ...client.months };
      if (!months[month]) {
        months[month] = ensureClientMonthWithCarry(client, month);
      }

      return {
        ...client,
        months,
      };
    }),
    generalData: {
      months: { ...data.generalData.months },
    },
  };

  if (!next.generalData.months[month]) {
    next.generalData.months[month] = ensureGeneralMonthWithCarry(next.generalData, month);
  }

  return next;
}

export async function getFinanceData(): Promise<FinanceData> {
  const raw = await readPersistentData<unknown>(FINANCE_FILE, null);
  const normalized = normalizeFinanceData(raw);
  const withCurrentMonth = ensureMonth(normalized, currentMonth());

  if (JSON.stringify(normalized) !== JSON.stringify(withCurrentMonth)) {
    await writePersistentData(FINANCE_FILE, withCurrentMonth);
  }

  return withCurrentMonth;
}

export async function writeFinanceData(data: FinanceData): Promise<void> {
  const normalized = normalizeFinanceData(data);
  await writePersistentData(FINANCE_FILE, normalized);
}
