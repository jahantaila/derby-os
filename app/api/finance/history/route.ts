import { NextRequest, NextResponse } from "next/server";
import { ensureMonthlySnapshotsTable, MonthlySnapshotRow, supabaseReq } from "@/lib/finance-server";

export async function GET(req: NextRequest) {
  try {
    await ensureMonthlySnapshotsTable().catch(() => null);
    const month = req.nextUrl.searchParams.get("month");
    const params = month
      ? `select=*&month=eq.${month}&order=month.asc`
      : "select=*&order=month.asc";
    const snapshots = (await supabaseReq("GET", "monthly_snapshots", { params })) as MonthlySnapshotRow[];
    return NextResponse.json({ snapshots });
  } catch (err: any) {
    return NextResponse.json({ snapshots: [], error: err.message }, { status: 200 });
  }
}
