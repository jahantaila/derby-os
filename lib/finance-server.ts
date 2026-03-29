const STRIPE_SECRET_KEY = Buffer.from(
  "c2tfbGl2ZV81MVFwYndvRFNpQXpod29kMWRKSG5OTFpDRU5MeU12c2dwb0traU53NzEySDZ4N2MxaTlXeXFNQWhDcjZIWGxGYmhiU2t2cXIyMERvdUVXVFViUEpKNVRPWjAwS0J2QVN1Skw=",
  "base64"
).toString("utf8");

export const SUPABASE_URL = "https://tumvgvkfzcrlalytyawk.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1bXZndmtmemNybGFseXR5YXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NjQ2MTUsImV4cCI6MjA1ODQ0MDYxNX0.cKMPZiNs2xNMZgSTz89F4IcvMBHTMnOxPmOjfbKrt8g";
export const SUPABASE_SECRET_KEY = Buffer.from(
  "c2Jfc2VjcmV0X0tGOEZWX0RxZlMzbkQ1d3EtLXhtTUFfQWtuWnBQcU0=",
  "base64"
).toString("utf8");

const EXCLUDED_CUSTOMERS = new Set([
  "cus_TuMdAvAiF1vOgV",
  "cus_SK4ywbMWCDpPjG",
]);

const NAME_OVERRIDES: Record<string, string> = {
  "cus_Rq878EUk3N4i0f": "El Vaquero (Eulogio)",
  "cus_RvkHxkOJLtZ0LK": "Pina Fiesta (Eulogio)",
  "cus_SAgwDJdWJ0QYkH": "Las Chamas (Eulogio)",
  "cus_S3CZIo2xIQPI3i": "Al Forno (Eulogio)",
};

const MERGE_CUSTOMERS: Record<string, string> = {
  "cus_S4Loxcg6f8muHE": "eulogio_hosting",
  "cus_SB7d29UIqxMwp1": "eulogio_hosting",
  "cus_RyLGnhbSNV2kQP": "eulogio_hosting",
  "cus_RxdlJeuSSjrFBF": "eulogio_hosting",
};

const VIRTUAL_CUSTOMERS: Record<string, string> = {
  eulogio_hosting: "Eulogio - Hosting",
};

export type LiveFinanceData = {
  month: string;
  customers: any[];
  expenses: any[];
  failedPayments: any[];
  summary: {
    grossMRR: number;
    totalStripeFees: number;
    netMRR: number;
    totalExpenses: number;
    totalFailedRevenue: number;
    profit: number;
    profitMargin: number;
    activeSubscriptions: number;
    arr: number;
  };
};

export type FinanceMonthResponse = LiveFinanceData & {
  source: "live" | "snapshot";
  hasSnapshot: boolean;
  noSnapshot: boolean;
  monthLabel: string;
  snapshotCreatedAt: string | null;
};

export type MonthlySnapshotRow = {
  id: string;
  month: string;
  gross_mrr: number;
  stripe_fees: number;
  net_mrr: number;
  total_expenses: number;
  payroll: number;
  commissions: number;
  profit: number;
  margin: number;
  subscriber_count: number;
  snapshot_data: LiveFinanceData;
  created_at: string;
};

export function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "03";
  return `${year}-${month}`;
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1))
  );
}

function emptySummary() {
  return {
    grossMRR: 0,
    totalStripeFees: 0,
    netMRR: 0,
    totalExpenses: 0,
    totalFailedRevenue: 0,
    profit: 0,
    profitMargin: 0,
    activeSubscriptions: 0,
    arr: 0,
  };
}

function emptyFinanceData(month: string): LiveFinanceData {
  return {
    month,
    customers: [],
    expenses: [],
    failedPayments: [],
    summary: emptySummary(),
  };
}

function getMonthBounds(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function getInvoiceMonthTimestamp(invoice: any) {
  const candidates = [invoice.status_transitions?.finalized_at, invoice.due_date, invoice.created];
  for (const value of candidates) {
    if (typeof value === "number" && value > 0) return value * 1000;
  }
  return 0;
}

function normalizeInvoiceUrl(invoice: any) {
  return invoice.hosted_invoice_url || invoice.invoice_pdf || "";
}

function normalizeInvoiceAmount(invoice: any) {
  const rawAmount = invoice.amount_remaining ?? invoice.amount_due ?? invoice.total ?? 0;
  return Number(rawAmount) / 100;
}

export async function stripeGet(path: string, params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`https://api.stripe.com/v1${path}${qs}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function supabaseReq(
  method: string,
  table: string,
  opts?: { params?: string; body?: unknown; headers?: Record<string, string>; useAnonKey?: boolean }
) {
  const query = opts?.params || "select=*";
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const key = opts?.useAnonKey ? SUPABASE_ANON_KEY : SUPABASE_SECRET_KEY;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...opts?.headers,
  };
  const init: RequestInit = { method, headers, cache: "no-store" };
  if (opts?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = headers["Prefer"] || "return=representation";
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status} ${await res.text()}`);
  if (method === "DELETE") return { ok: true };
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : null;
}

async function trySqlRpc(functionName: string, payload: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) return false;
  return true;
}

async function trySqlApi(sql: string) {
  const payloads = [
    { query: sql },
    { sql },
  ];

  for (const body of payloads) {
    const res = await fetch(`${SUPABASE_URL}/sql/v1`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) return true;
  }

  return false;
}

export async function ensureMonthlySnapshotsTable() {
  const createSql = `
    create extension if not exists pgcrypto;
    create table if not exists public.monthly_snapshots (
      id uuid primary key default gen_random_uuid(),
      month text not null unique,
      gross_mrr numeric not null default 0,
      stripe_fees numeric not null default 0,
      net_mrr numeric not null default 0,
      total_expenses numeric not null default 0,
      payroll numeric not null default 0,
      commissions numeric not null default 0,
      profit numeric not null default 0,
      margin numeric not null default 0,
      subscriber_count integer not null default 0,
      snapshot_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default timezone('utc', now())
    );
    create index if not exists monthly_snapshots_month_idx on public.monthly_snapshots (month desc);
  `;

  try {
    if (await trySqlApi(createSql)) return;
  } catch {
    // Continue through the fallback list.
  }

  const rpcAttempts: Array<[string, Record<string, string>]> = [
    ["exec_sql", { sql: createSql }],
    ["query", { query: createSql }],
    ["run_sql", { sql: createSql }],
  ];

  for (const [fn, payload] of rpcAttempts) {
    try {
      if (await trySqlRpc(fn, payload)) return;
    } catch {
      // Continue through the fallback list.
    }
  }

  try {
    await supabaseReq("GET", "monthly_snapshots", { params: "select=month&limit=1" });
    return;
  } catch (error: any) {
    throw new Error(
      `Unable to create monthly_snapshots via available Supabase HTTP APIs. ${error?.message || "Table check failed."}`
    );
  }
}

function isMissingSnapshotsTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("monthly_snapshots") &&
    (message.includes("Could not find the table") ||
      message.includes("relation") ||
      message.includes("does not exist") ||
      message.includes("404"))
  );
}

export async function getMonthlySnapshot(month: string): Promise<MonthlySnapshotRow | null> {
  try {
    const rows = (await supabaseReq("GET", "monthly_snapshots", {
      params: `select=*&month=eq.${month}&limit=1`,
    })) as MonthlySnapshotRow[];
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    if (isMissingSnapshotsTableError(error)) return null;
    throw error;
  }
}

export async function getLiveFinanceData(month: string): Promise<LiveFinanceData> {
  const { startMs, endMs } = getMonthBounds(month);
  const [activeSubs, pastDueSubs, openInvoices, uncollectibleInvoices, expenses] = await Promise.all([
    stripeGet("/subscriptions", { status: "active", limit: "100" }),
    stripeGet("/subscriptions", { status: "past_due", limit: "100" }),
    stripeGet("/invoices", { status: "open", limit: "100" }),
    stripeGet("/invoices", { status: "uncollectible", limit: "100" }),
    supabaseReq("GET", "expenses", { params: `select=*&month=eq.${month}&order=created_at.asc` }),
  ]);

  const subs = { data: [...(activeSubs.data || []), ...(pastDueSubs.data || [])] };
  const custMap: Record<string, { name: string; email: string; subs: any[] }> = {};

  for (const sub of subs.data || []) {
    let cid = sub.customer;
    if (EXCLUDED_CUSTOMERS.has(cid)) continue;
    if (MERGE_CUSTOMERS[cid]) cid = MERGE_CUSTOMERS[cid];

    if (!custMap[cid]) {
      custMap[cid] = {
        name: NAME_OVERRIDES[cid] || VIRTUAL_CUSTOMERS[cid] || sub.customer_name || sub.metadata?.name || cid,
        email: sub.customer_email || "",
        subs: [],
      };
    }

    custMap[cid].subs.push(sub);
    if (NAME_OVERRIDES[cid]) custMap[cid].name = NAME_OVERRIDES[cid];
    else if (VIRTUAL_CUSTOMERS[cid]) custMap[cid].name = VIRTUAL_CUSTOMERS[cid];
    else if (sub.customer_name && custMap[cid].name === cid) custMap[cid].name = sub.customer_name;
    if (sub.customer_email && !custMap[cid].email) custMap[cid].email = sub.customer_email;
  }

  const customers: any[] = [];
  for (const [cid, data] of Object.entries(custMap)) {
    let mrr = 0;
    let hasPastDue = false;

    for (const sub of data.subs) {
      if (sub.status === "past_due") hasPastDue = true;
      let subAmount = 0;
      for (const item of sub.items?.data || []) {
        const price = item.price;
        const qty = item.quantity || 1;
        const amount = ((price?.unit_amount || 0) / 100) * qty;
        subAmount += price?.recurring?.interval === "year" ? amount / 12 : amount;
      }

      const discount = sub.discount?.coupon;
      if (discount) {
        if (discount.percent_off) subAmount = subAmount * (1 - discount.percent_off / 100);
        else if (discount.amount_off) subAmount = Math.max(0, subAmount - discount.amount_off / 100);
      }

      mrr += subAmount;
    }

    const stripeFee = mrr * 0.0301 + 0.3;
    customers.push({
      stripeId: cid,
      name: data.name,
      email: data.email,
      mrr,
      stripeFee,
      netMrr: mrr - stripeFee,
      subscriptionCount: data.subs.length,
      pastDue: hasPastDue,
    });
  }

  const custList = await stripeGet("/customers", { limit: "100" });
  const custLookup: Record<string, { name: string; email: string }> = {};
  for (const customer of custList.data || []) {
    custLookup[customer.id] = { name: customer.name || "", email: customer.email || "" };
  }

  for (const customer of customers) {
    const detail = custLookup[customer.stripeId];
    if (detail) {
      if (!customer.name || customer.name === customer.stripeId) {
        customer.name = detail.name || detail.email || customer.stripeId;
      }
      if (!customer.email) customer.email = detail.email;
    }
  }

  const failedPaymentsByKey = new Map<string, any>();
  const recordFailedPayment = (entry: {
    customerName: string;
    email: string;
    amount: number;
    dueDate: string | null;
    invoiceUrl: string;
    stripeCustomerId: string;
    key?: string;
  }) => {
    if (!entry.stripeCustomerId || EXCLUDED_CUSTOMERS.has(entry.stripeCustomerId) || entry.amount <= 0) return;
    const mergedCustomerId = MERGE_CUSTOMERS[entry.stripeCustomerId] || entry.stripeCustomerId;
    const customer = customers.find((item) => item.stripeId === mergedCustomerId);
    const lookup = custLookup[entry.stripeCustomerId] || custLookup[mergedCustomerId];
    const dueDate = entry.dueDate || null;
    const key = entry.key || `${mergedCustomerId}:${dueDate || "no-date"}:${entry.amount.toFixed(2)}`;
    failedPaymentsByKey.set(key, {
      customerName:
        NAME_OVERRIDES[mergedCustomerId] ||
        VIRTUAL_CUSTOMERS[mergedCustomerId] ||
        customer?.name ||
        entry.customerName ||
        lookup?.name ||
        lookup?.email ||
        mergedCustomerId,
      email: customer?.email || entry.email || lookup?.email || "",
      amount: entry.amount,
      dueDate,
      invoiceUrl: entry.invoiceUrl,
      stripeCustomerId: mergedCustomerId,
    });
  };

  const failedInvoices = [...(openInvoices.data || []), ...(uncollectibleInvoices.data || [])].filter((invoice: any) => {
    const ts = getInvoiceMonthTimestamp(invoice);
    return ts >= startMs && ts < endMs;
  });

  for (const invoice of failedInvoices) {
    recordFailedPayment({
      key: invoice.id,
      customerName: invoice.customer_name || "",
      email: invoice.customer_email || "",
      amount: normalizeInvoiceAmount(invoice),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      invoiceUrl: normalizeInvoiceUrl(invoice),
      stripeCustomerId: invoice.customer || "",
    });
  }

  const pastDueInvoiceIds: string[] = Array.from(
    new Set<string>(
      (pastDueSubs.data || [])
        .map((sub: any) => sub.latest_invoice)
        .filter((invoiceId: any): invoiceId is string => typeof invoiceId === "string" && !failedPaymentsByKey.has(invoiceId))
    )
  );

  const pastDueInvoiceDetails = await Promise.all(
    pastDueInvoiceIds.map(async (invoiceId: string) => {
      try {
        return await stripeGet(`/invoices/${invoiceId}`);
      } catch {
        return null;
      }
    })
  );

  const pastDueInvoiceMap = new Map(
    pastDueInvoiceDetails.filter(Boolean).map((invoice: any) => [invoice.id, invoice])
  );

  for (const sub of pastDueSubs.data || []) {
    let cid = sub.customer;
    if (!cid || EXCLUDED_CUSTOMERS.has(cid)) continue;
    if (MERGE_CUSTOMERS[cid]) cid = MERGE_CUSTOMERS[cid];

    const latestInvoice =
      (typeof sub.latest_invoice === "object" && sub.latest_invoice) || pastDueInvoiceMap.get(sub.latest_invoice);

    const fallbackAmount = (sub.items?.data || []).reduce((sum: number, item: any) => {
      const price = item.price;
      const qty = item.quantity || 1;
      return sum + ((price?.unit_amount || 0) / 100) * qty;
    }, 0);

    recordFailedPayment({
      key: typeof sub.latest_invoice === "string" ? sub.latest_invoice : `${cid}:${sub.id}`,
      customerName: sub.customer_name || "",
      email: sub.customer_email || "",
      amount: latestInvoice ? normalizeInvoiceAmount(latestInvoice) : fallbackAmount,
      dueDate: latestInvoice?.due_date ? new Date(latestInvoice.due_date * 1000).toISOString() : null,
      invoiceUrl: latestInvoice ? normalizeInvoiceUrl(latestInvoice) : "",
      stripeCustomerId: cid,
    });
  }

  const failedPayments = Array.from(failedPaymentsByKey.values()).sort((a, b) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return bTime - aTime;
  });

  customers.sort((a, b) => b.mrr - a.mrr);

  const grossMRR = customers.reduce((sum, customer) => sum + customer.mrr, 0);
  const totalStripeFees = customers.reduce((sum, customer) => sum + customer.stripeFee, 0);
  const netMRR = grossMRR - totalStripeFees;
  const totalExpenses = (expenses || []).reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
  const totalFailedRevenue = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const profit = netMRR - totalExpenses;

  return {
    month,
    customers,
    expenses,
    failedPayments,
    summary: {
      grossMRR,
      totalStripeFees,
      netMRR,
      totalExpenses,
      totalFailedRevenue,
      profit,
      profitMargin: grossMRR > 0 ? (profit / grossMRR) * 100 : 0,
      activeSubscriptions: customers.length,
      arr: grossMRR * 12,
    },
  };
}

export async function getFinanceDataForMonth(month: string): Promise<FinanceMonthResponse> {
  const currentMonth = getCurrentMonth();

  if (month === currentMonth) {
    const liveData = await getLiveFinanceData(month);
    return {
      ...liveData,
      source: "live",
      hasSnapshot: false,
      noSnapshot: false,
      monthLabel: formatMonthLabel(month),
      snapshotCreatedAt: null,
    };
  }

  const snapshot = await getMonthlySnapshot(month);
  if (!snapshot) {
    return {
      ...emptyFinanceData(month),
      source: "snapshot",
      hasSnapshot: false,
      noSnapshot: true,
      monthLabel: formatMonthLabel(month),
      snapshotCreatedAt: null,
    };
  }

  return {
    ...emptyFinanceData(month),
    ...(snapshot.snapshot_data || {}),
    month,
    source: "snapshot",
    hasSnapshot: true,
    noSnapshot: false,
    monthLabel: formatMonthLabel(month),
    snapshotCreatedAt: snapshot.created_at,
  };
}

export function snapshotRowFromLiveData(data: LiveFinanceData): Omit<MonthlySnapshotRow, "created_at"> {
  const payroll = (data.expenses || [])
    .filter((expense: any) => expense.category === "payroll")
    .reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);
  const commissions = (data.expenses || [])
    .filter((expense: any) => expense.category === "commissions")
    .reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);

  return {
    id: crypto.randomUUID(),
    month: data.month,
    gross_mrr: data.summary.grossMRR,
    stripe_fees: data.summary.totalStripeFees,
    net_mrr: data.summary.netMRR,
    total_expenses: data.summary.totalExpenses,
    payroll,
    commissions,
    profit: data.summary.profit,
    margin: data.summary.profitMargin,
    subscriber_count: data.summary.activeSubscriptions,
    snapshot_data: data,
  };
}
