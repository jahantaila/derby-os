import { NextResponse } from "next/server";
import { buildFinanceSummary, getFinanceData } from "@/lib/finance-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const data = await getFinanceData();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? undefined;
  return NextResponse.json(buildFinanceSummary(data, month));
}
