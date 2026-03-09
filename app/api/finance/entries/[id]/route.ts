import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceCategory } from "@/lib/finance-types";

type UpdateEntryBody = {
  date?: string;
  description?: string;
  category?: FinanceCategory;
  clientId?: string | null;
  amount?: number;
};

export async function PATCH(request: Request, context: { params: { id: string } }) {
  let body: UpdateEntryBody;

  try {
    body = (await request.json()) as UpdateEntryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = await getFinanceData();
  const index = data.entries.findIndex((entry) => entry.id === context.params.id);

  if (index === -1) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (body.category && body.category !== "revenue" && body.category !== "expense") {
    return NextResponse.json({ error: "Field 'category' must be revenue or expense" }, { status: 400 });
  }

  const amount = body.amount === undefined ? undefined : Number(body.amount);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "Field 'amount' must be a positive number" }, { status: 400 });
  }

  if (body.clientId && !data.clients.some((client) => client.id === body.clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const previous = data.entries[index];
  const updated = {
    ...previous,
    date: typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : previous.date,
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : previous.description,
    category: body.category ?? previous.category,
    clientId: body.clientId === undefined ? previous.clientId : body.clientId,
    amount: amount ?? previous.amount,
  };

  data.entries[index] = updated;
  await writeFinanceData(data);

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const data = await getFinanceData();
  const exists = data.entries.some((entry) => entry.id === context.params.id);

  if (!exists) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  data.entries = data.entries.filter((entry) => entry.id !== context.params.id);
  await writeFinanceData(data);

  return NextResponse.json({ ok: true });
}
