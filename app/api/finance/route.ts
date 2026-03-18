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

  try {
    // Fetch active + past_due subscriptions + Supabase expenses in parallel
    const [activeSubs, pastDueSubs, expenses] = await Promise.all([
      stripeGet("/subscriptions", { status: "active", limit: "100" }),
      stripeGet("/subscriptions", { status: "past_due", limit: "100" }),
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

    // Sort by MRR descending
    customers.sort((a, b) => b.mrr - a.mrr);

    // Summary
    const grossMRR = customers.reduce((s, c) => s + c.mrr, 0);
    const totalStripeFees = customers.reduce((s, c) => s + c.stripeFee, 0);
    const netMRR = grossMRR - totalStripeFees;
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const profit = netMRR - totalExpenses;

    return NextResponse.json({
      month,
      customers,
      expenses,
      summary: {
        grossMRR,
        totalStripeFees,
        netMRR,
        totalExpenses,
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
