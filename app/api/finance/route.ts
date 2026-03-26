import { NextRequest, NextResponse } from "next/server";

// ─── Stripe Config ───
const SK_B64 = "c2tfbGl2ZV81MVFwYndvRFNpQXpod29kMWRKSG5OTFpDRU5MeU12c2dwb0traU53NzEySDZ4N2MxaTlXeXFNQWhDcjZIWGxGYmhiU2t2cXIyMERvdUVXVFViUEpKNVRPWjAwS0J2QVN1Skw=";
const STRIPE_SK = (() => { try { return atob(SK_B64); } catch { return ""; } })();

// ─── Supabase Config ───
const SUPABASE_URL = "https://tumvgvkfzcrlalytyawk.supabase.co";
const SB_B64 = "c2Jfc2VjcmV0X0tGOEZWX0RxZlMzbkQ1d3EtLXhtTUFfQWtuWnBQcU0=";
const SUPABASE_KEY = (() => { try { return atob(SB_B64); } catch { return ""; } })();

async function stripeGet(path: string, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`https://api.stripe.com/v1${path}${qs}`, {
    headers: { Authorization: `Bearer ${STRIPE_SK}` },
  });
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status}`);
  return res.json();
}

async function supabaseReq(method: string, table: string, opts?: { params?: string; body?: any }) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${opts?.params || "select=*"}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
  const init: RequestInit = { method, headers };
  if (opts?.body) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status}`);
  if (method === "DELETE") return { ok: true };
  return res.json();
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

// ─── Customer Overrides ───
// Excluded customers (not real clients)
const EXCLUDED_CUSTOMERS = new Set([
  "cus_TuMdAvAiF1vOgV", // Zimri — not a customer
  "cus_SK4ywbMWCDpPjG", // Kendell Sheppard — churned, paused in Stripe
]);

// Name overrides (display name corrections)
const NAME_OVERRIDES: Record<string, string> = {
  "cus_Rq878EUk3N4i0f": "El Vaquero (Eulogio)",
  "cus_RvkHxkOJLtZ0LK": "Pina Fiesta (Eulogio)",
  "cus_SAgwDJdWJ0QYkH": "Las Chamas (Eulogio)",
  "cus_S3CZIo2xIQPI3i": "Al Forno (Eulogio)",
};

// Merge hosting fees under one entry
const MERGE_CUSTOMERS: Record<string, string> = {
  "cus_S4Loxcg6f8muHE": "eulogio_hosting",
  "cus_SB7d29UIqxMwp1": "eulogio_hosting",
  "cus_RyLGnhbSNV2kQP": "eulogio_hosting",
  "cus_RxdlJeuSSjrFBF": "eulogio_hosting",
};

// Virtual customer entries for merged groups
const VIRTUAL_CUSTOMERS: Record<string, string> = {
  "eulogio_hosting": "Eulogio - Hosting",
};

// ─── GET: Fetch all finance data ───
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const { startMs, endMs } = getMonthBounds(month);

  try {
    // Fetch active + past_due subscriptions + failed invoices + Supabase expenses in parallel
    const [activeSubs, pastDueSubs, openInvoices, uncollectibleInvoices, expenses] = await Promise.all([
      stripeGet("/subscriptions", { status: "active", limit: "100" }),
      stripeGet("/subscriptions", { status: "past_due", limit: "100" }),
      stripeGet("/invoices", { status: "open", limit: "100" }),
      stripeGet("/invoices", { status: "uncollectible", limit: "100" }),
      supabaseReq("GET", "expenses", { params: `select=*&month=eq.${month}&order=created_at.asc` }),
    ]);
    const subs = { data: [...(activeSubs.data || []), ...(pastDueSubs.data || [])] };

    // Group all subscriptions by customer, sum MRR, apply coupons
    const custMap: Record<string, { name: string; email: string; subs: any[] }> = {};

    for (const sub of subs.data || []) {
      let cid = sub.customer;
      
      // Skip excluded customers
      if (EXCLUDED_CUSTOMERS.has(cid)) continue;
      
      // Merge customer IDs
      if (MERGE_CUSTOMERS[cid]) cid = MERGE_CUSTOMERS[cid];
      
      if (!custMap[cid]) {
        custMap[cid] = {
          name: NAME_OVERRIDES[cid] || VIRTUAL_CUSTOMERS[cid] || sub.customer_name || sub.metadata?.name || cid,
          email: sub.customer_email || "",
          subs: [],
        };
      }
      custMap[cid].subs.push(sub);
      // Use name override or from whichever sub has it
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
        // Sum all line items in this subscription (with quantity)
        let subAmount = 0;
        for (const item of sub.items?.data || []) {
          const price = item.price;
          const qty = item.quantity || 1;
          const amount = ((price?.unit_amount || 0) / 100) * qty;
          subAmount += price?.recurring?.interval === "year" ? amount / 12 : amount;
        }

        // Apply coupon discount
        const discount = sub.discount?.coupon;
        if (discount) {
          if (discount.percent_off) {
            subAmount = subAmount * (1 - discount.percent_off / 100);
          } else if (discount.amount_off) {
            subAmount = Math.max(0, subAmount - discount.amount_off / 100);
          }
        }

        mrr += subAmount;
      }

      const stripeFee = mrr * 0.0301 + 0.30;

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

    // Fetch ALL customer details in one call (Stripe supports up to 100)
    const custList = await stripeGet("/customers", { limit: "100" });
    const custLookup: Record<string, { name: string; email: string }> = {};
    for (const c of custList.data || []) {
      custLookup[c.id] = { name: c.name || "", email: c.email || "" };
    }
    // Apply names to all customers
    for (const c of customers) {
      const detail = custLookup[c.stripeId];
      if (detail) {
        if (!c.name || c.name === c.stripeId) c.name = detail.name || detail.email || c.stripeId;
        if (!c.email) c.email = detail.email;
      }
    }

    const failedPaymentsByKey = new Map<string, {
      customerName: string;
      email: string;
      amount: number;
      dueDate: string | null;
      invoiceUrl: string;
      stripeCustomerId: string;
    }>();

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
      const customer = customers.find((c) => c.stripeId === mergedCustomerId);
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

    const failedInvoices = [...(openInvoices.data || []), ...(uncollectibleInvoices.data || [])]
      .filter((invoice: any) => {
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

    const pastDueInvoiceIds: string[] = Array.from(new Set<string>(
      (pastDueSubs.data || [])
        .map((sub: any) => sub.latest_invoice)
        .filter((invoiceId: any): invoiceId is string => typeof invoiceId === "string" && !failedPaymentsByKey.has(invoiceId))
    ));

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
      pastDueInvoiceDetails
        .filter(Boolean)
        .map((invoice: any) => [invoice.id, invoice])
    );

    for (const sub of pastDueSubs.data || []) {
      let cid = sub.customer;
      if (!cid || EXCLUDED_CUSTOMERS.has(cid)) continue;
      if (MERGE_CUSTOMERS[cid]) cid = MERGE_CUSTOMERS[cid];

      const latestInvoice =
        (typeof sub.latest_invoice === "object" && sub.latest_invoice) ||
        pastDueInvoiceMap.get(sub.latest_invoice);

      const fallbackAmount = (sub.items?.data || []).reduce((sum: number, item: any) => {
        const price = item.price;
        const qty = item.quantity || 1;
        return sum + (((price?.unit_amount || 0) / 100) * qty);
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

    // Sort by MRR descending
    customers.sort((a, b) => b.mrr - a.mrr);

    // Summary
    const grossMRR = customers.reduce((s, c) => s + c.mrr, 0);
    const totalStripeFees = customers.reduce((s, c) => s + c.stripeFee, 0);
    const netMRR = grossMRR - totalStripeFees;
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalFailedRevenue = failedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const profit = netMRR - totalExpenses;

    return NextResponse.json({
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
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: Add expense ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(await supabaseReq("POST", "expenses", { body }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH: Update expense ───
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    return NextResponse.json(await supabaseReq("PATCH", "expenses", { params: `id=eq.${id}`, body: { ...body, updated_at: new Date().toISOString() } }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: Remove expense ───
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    return NextResponse.json(await supabaseReq("DELETE", "expenses", { params: `id=eq.${id}` }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
