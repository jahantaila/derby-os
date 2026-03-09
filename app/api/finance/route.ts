import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceData } from "@/lib/finance-types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getFinanceData());
}

export async function PUT(request: Request) {
  let body: FinanceData;

  try {
    body = (await request.json()) as FinanceData;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await writeFinanceData(body);
  return NextResponse.json(await getFinanceData());
}
