import { NextRequest, NextResponse } from "next/server";
import { getCurrentMonth, getFinanceDataForMonth, supabaseReq } from "@/lib/finance-server";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || getCurrentMonth();

  try {
    const data = await getFinanceDataForMonth(month);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(await supabaseReq("POST", "expenses", { body }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    return NextResponse.json(
      await supabaseReq("PATCH", "expenses", {
        params: `id=eq.${id}`,
        body: { ...body, updated_at: new Date().toISOString() },
      })
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    return NextResponse.json(await supabaseReq("DELETE", "expenses", { params: `id=eq.${id}` }));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
