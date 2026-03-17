import { NextRequest, NextResponse } from "next/server";

// ─── Stripe Config ───
const SK_B64 = "c2tfbGl2ZV81MVFwYndvRFNpQXpod29kMWRKSG5OTFpDRU5MeU12c2dwb0traU53NzEySDZ4N2MxaTlXeXFNQWhDcjZIWGxGYmhiU2t2cXIyMERvdUVXVFViUEpKNVRPWjAwS0J2QVN1Skw=";
const STRIPE_SK = (() => {
  try { return atob(SK_B64); } catch { return ""; }
})();

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

async function supabaseGet(table: string, params?: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params || "select=*"}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

async function supabasePost(table: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase POST ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabasePatch(table: string, id: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${res.status}`);
  return res.json();
}

async function supabaseDelete(table: string, id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${table}: ${res.status}`);
  return { ok: true };
}

// ─── GET: Fetch all finance data ───
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const [year, mo] = month.split("-").map(Number);
  const startTs = Math.floor(new Date(year, mo - 1, 1).getTime() / 1000);
  const endTs = Math.floor(new Date(year, mo, 1).getTime() / 1000);

  try {
    // Fetch Stripe data in parallel
    const [subscriptions, chargesRaw, expenses] = await Promise.all([
      stripeGet("/subscriptions", { status: "active", limit: "100" }),
      stripeGet("/charges", { limit: "100", "created[gte]": String(startTs), "created[lt]": String(endTs) }),
      supabaseGet("expenses", `select=*&month=eq.${month}&order=created_at.asc`),
    ]);

    // Build customer → charges map
    const chargesByCustomer: Record<string, any[]> = {};
    for (const charge of chargesRaw.data || []) {
      if (charge.status !== "succeeded") continue;
      const cid = charge.customer || "unknown";
      if (!chargesByCustomer[cid]) chargesByCustomer[cid] = [];
      chargesByCustomer[cid].push({
        id: charge.id,
        amount: charge.amount / 100,
        fee: (charge.amount / 100) * 0.0301 + 0.30,
        created: charge.created,
        description: charge.description || "",
        status: charge.status,
      });
    }

    // Build customer list from active subscriptions
    const customers: any[] = [];
    const seenCustomers = new Set<string>();
    
    for (const sub of subscriptions.data || []) {
      const cid = sub.customer;
      if (seenCustomers.has(cid)) continue;
      seenCustomers.add(cid);

      const charges = chargesByCustomer[cid] || [];
      const totalRevenue = charges.reduce((s: number, c: any) => s + c.amount, 0);
      const totalFees = charges.reduce((s: number, c: any) => s + c.fee, 0);
      const mrr = (sub.items?.data?.[0]?.price?.unit_amount || 0) / 100;

      customers.push({
        stripeId: cid,
        name: sub.customer_name || sub.metadata?.name || cid,
        email: sub.customer_email || "",
        mrr,
        totalRevenue,
        stripeFee: totalFees,
        netRevenue: totalRevenue - totalFees,
        charges,
        hasSubscription: true,
        subscriptionStatus: sub.status,
        currentPeriodEnd: sub.current_period_end,
      });
    }

    // Also add customers with charges but no active subscription (churned)
    for (const [cid, charges] of Object.entries(chargesByCustomer)) {
      if (seenCustomers.has(cid)) continue;
      const totalRevenue = charges.reduce((s: number, c: any) => s + c.amount, 0);
      const totalFees = charges.reduce((s: number, c: any) => s + c.fee, 0);
      customers.push({
        stripeId: cid,
        name: cid,
        email: "",
        mrr: 0,
        totalRevenue,
        stripeFee: totalFees,
        netRevenue: totalRevenue - totalFees,
        charges,
        hasSubscription: false,
        subscriptionStatus: "none",
      });
    }

    // Fetch full customer details for names
    const customerIds = customers.filter(c => c.name === c.stripeId).map(c => c.stripeId);
    if (customerIds.length > 0) {
      const detailPromises = customerIds.slice(0, 20).map(id => 
        stripeGet(`/customers/${id}`).catch(() => null)
      );
      const details = await Promise.all(detailPromises);
      for (const detail of details) {
        if (!detail) continue;
        const cust = customers.find(c => c.stripeId === detail.id);
        if (cust) {
          cust.name = detail.name || detail.email || cust.stripeId;
          cust.email = detail.email || cust.email;
        }
      }
    }

    // Sort by revenue descending
    customers.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Summary
    const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
    const totalStripeFees = customers.reduce((s, c) => s + c.stripeFee, 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalMRR = customers.filter(c => c.hasSubscription).reduce((s, c) => s + c.mrr, 0);
    const netProfit = totalRevenue - totalStripeFees - totalExpenses;

    return NextResponse.json({
      month,
      customers,
      expenses,
      summary: {
        totalRevenue,
        totalStripeFees,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        activeSubscriptions: subscriptions.data?.length || 0,
        totalMRR,
        totalCharges: chargesRaw.data?.filter((c: any) => c.status === "succeeded").length || 0,
        customerCount: customers.length,
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
    const result = await supabasePost("expenses", body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH: Update expense ───
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const result = await supabasePatch("expenses", id, { ...body, updated_at: new Date().toISOString() });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: Remove expense ───
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const result = await supabaseDelete("expenses", id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
