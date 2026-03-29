import { NextRequest, NextResponse } from "next/server";
import {
  ensureMonthlySnapshotsTable,
  getCurrentMonth,
  getLiveFinanceData,
  snapshotRowFromLiveData,
  supabaseReq,
} from "@/lib/finance-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const month = typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : getCurrentMonth();

    await ensureMonthlySnapshotsTable();

    const liveData = await getLiveFinanceData(month);
    const row = snapshotRowFromLiveData(liveData);
    const created = await supabaseReq("POST", "monthly_snapshots", {
      params: "on_conflict=month",
      body: row,
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    });

    return NextResponse.json({ snapshot: Array.isArray(created) ? created[0] : created, liveData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
