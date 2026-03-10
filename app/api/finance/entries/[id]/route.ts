import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceRecordCategory, FinanceRecordType } from "@/lib/finance-types";

type UpdateRecordBody = {
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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  let body: UpdateRecordBody;

  try {
    body = (await request.json()) as UpdateRecordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = await getFinanceData();
  const index = data.records.findIndex((record) => record.id === context.params.id);

  if (index === -1) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  if (body.type !== undefined && !isValidType(body.type)) {
    return NextResponse.json({ error: "Field 'type' must be income or expense" }, { status: 400 });
  }

  if (body.category !== undefined && !isValidCategory(body.category)) {
    return NextResponse.json({ error: "Field 'category' is invalid" }, { status: 400 });
  }

  const amount = body.amount === undefined ? undefined : Number(body.amount);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "Field 'amount' must be a positive number" }, { status: 400 });
  }

  if (body.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Field 'date' must be YYYY-MM-DD" }, { status: 400 });
  }

  if (body.client && !data.clients.some((item) => item.id === body.client)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const previous = data.records[index];
  const updated = {
    ...previous,
    type: body.type ?? previous.type,
    client: body.client === undefined ? previous.client : body.client,
    amount: amount ?? previous.amount,
    category: body.category ?? previous.category,
    date: body.date ?? previous.date,
    notes: typeof body.notes === "string" ? body.notes.trim() : previous.notes,
    recurring: body.recurring ?? previous.recurring,
  };

  data.records[index] = updated;
  await writeFinanceData(data);

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const data = await getFinanceData();
  const exists = data.records.some((record) => record.id === context.params.id);

  if (!exists) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  data.records = data.records.filter((record) => record.id !== context.params.id);
  await writeFinanceData(data);

  return NextResponse.json({ ok: true });
}
