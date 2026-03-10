import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceRecord, FinanceRecordCategory, FinanceRecordType } from "@/lib/finance-types";

type CreateRecordBody = {
  type?: FinanceRecordType;
  client?: string | null;
  amount?: number;
  category?: FinanceRecordCategory;
  date?: string;
  notes?: string;
  recurring?: boolean;
};

function isValidType(value: unknown): value is FinanceRecordType {
  return value === "income" || value === "expense";
}

function isValidCategory(value: unknown): value is FinanceRecordCategory {
  return value === "retainer" || value === "ad spend" || value === "tool cost" || value === "freelancer" || value === "other";
}

export async function POST(request: Request) {
  let body: CreateRecordBody;

  try {
    body = (await request.json()) as CreateRecordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidType(body.type)) {
    return NextResponse.json({ error: "Field 'type' must be income or expense" }, { status: 400 });
  }

  if (!isValidCategory(body.category)) {
    return NextResponse.json({ error: "Field 'category' is invalid" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Field 'amount' must be a positive number" }, { status: 400 });
  }

  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Field 'date' must be YYYY-MM-DD" }, { status: 400 });
  }

  const data = await getFinanceData();
  const client = typeof body.client === "string" && body.client.trim() ? body.client.trim() : null;

  if (client && !data.clients.some((item) => item.id === client)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const record: FinanceRecord = {
    id: crypto.randomUUID(),
    type: body.type,
    client,
    amount,
    category: body.category,
    date: body.date,
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    recurring: Boolean(body.recurring),
  };

  data.records.unshift(record);
  await writeFinanceData(data);

  return NextResponse.json(record, { status: 201 });
}
