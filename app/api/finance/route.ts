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

// ─── GET: Fetch all finance data ───
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);

  try {
    // Fetch Stripe subscriptions + Supabase expenses in parallel
    const [subs, expenses] = await Promise.all([
      stripeGet("/subscriptions", { status: "active", limit: "100" }),
      supabaseReq("GET", "expenses", { params: `select=*&month=eq.${month}&order=created_at.asc` }),
    ]);

    // Group all subscriptions by customer, sum MRR, apply coupons
    const custMap: Record<string, { name: string; email: string; subs: any[] }> = {};

    for (const sub of subs.data || []) {
      const cid = sub.customer;
      if (!custMap[cid]) {
        custMap[cid] = {
          name: sub.customer_name || sub.metadata?.name || cid,
          email: sub.customer_email || "",
          subs: [],
        };
      }
      custMap[cid].subs.push(sub);
      // Use name/email from whichever sub has it
      if (sub.customer_name && custMap[cid].name === cid) custMap[cid].name = sub.customer_name;
      if (sub.customer_email && !custMap[cid].email) custMap[cid].email = sub.customer_email;
    }

    const customers: any[] = [];
    for (const [cid, data] of Object.entries(custMap)) {
      let mrr = 0;

      for (const sub of data.subs) {
        // Sum all line items in this subscription
        let subAmount = 0;
        for (const item of sub.items?.data || []) {
          const price = item.price;
          const amount = (price?.unit_amount || 0) / 100;
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
