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

    // Build customer list from active subscriptions
    const customers: any[] = [];
    const seenCustomers = new Set<string>();

    for (const sub of subs.data || []) {
      const cid = sub.customer;
      if (seenCustomers.has(cid)) continue;
      seenCustomers.add(cid);

      // Sum all subscription items for this customer
      let mrr = 0;
      for (const item of sub.items?.data || []) {
        const price = item.price;
        const amount = (price?.unit_amount || 0) / 100;
        if (price?.recurring?.interval === "year") {
          mrr += amount / 12;
        } else {
          mrr += amount;
        }
      }

      const stripeFee = mrr * 0.0301 + 0.30;

      customers.push({
        stripeId: cid,
        name: sub.customer_name || sub.metadata?.name || cid,
        email: sub.customer_email || "",
        mrr,
        stripeFee,
        netMrr: mrr - stripeFee,
        subscriptionStatus: sub.status,
        currentPeriodEnd: sub.current_period_end,
      });
    }

    // Fetch names for customers that only have IDs
    const unnamed = customers.filter(c => c.name === c.stripeId);
    if (unnamed.length > 0) {
      const details = await Promise.all(
        unnamed.slice(0, 25).map(c => stripeGet(`/customers/${c.stripeId}`).catch(() => null))
      );
      for (const d of details) {
        if (!d) continue;
        const c = customers.find(x => x.stripeId === d.id);
        if (c) {
          c.name = d.name || d.email || c.stripeId;
          c.email = d.email || c.email;
        }
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
