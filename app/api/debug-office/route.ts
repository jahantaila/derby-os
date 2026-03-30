import { NextResponse } from "next/server";
import { supabaseReq } from "@/lib/finance-server";

export async function GET() {
  try {
    const rows = await supabaseReq("GET", "tasks", {
      params: "select=id,title,status,assignee&order=updated_at.desc&limit=10",
    });
    const inProgress = Array.isArray(rows) ? rows.filter((r: any) => r.status === "in_progress") : [];
    return NextResponse.json({ ok: true, total: Array.isArray(rows) ? rows.length : 0, inProgress });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
