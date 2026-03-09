import { NextResponse } from "next/server";
import { buildFinanceSummary, getFinanceData } from "@/lib/finance-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getFinanceData();
  return NextResponse.json(buildFinanceSummary(data));
}
