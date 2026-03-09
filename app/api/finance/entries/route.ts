import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceCategory } from "@/lib/finance-types";

type CreateEntryBody = {
  date?: string;
  description?: string;
  category?: FinanceCategory;
  clientId?: string | null;
  amount?: number;
};

export async function POST(request: Request) {
  let body: CreateEntryBody;

  try {
    body = (await request.json()) as CreateEntryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return NextResponse.json({ error: "Field 'description' is required" }, { status: 400 });
  }

  if (body.category !== "revenue" && body.category !== "expense") {
    return NextResponse.json({ error: "Field 'category' must be revenue or expense" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Field 'amount' must be a positive number" }, { status: 400 });
  }

  const data = await getFinanceData();
  const clientId = typeof body.clientId === "string" && body.clientId.trim() ? body.clientId : null;

  if (clientId && !data.clients.some((client) => client.id === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const entry = {
    id: crypto.randomUUID(),
    date: typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10),
    description: body.description.trim(),
    category: body.category,
    clientId,
    amount,
  };

  data.entries.unshift(entry);
  await writeFinanceData(data);

  return NextResponse.json(entry, { status: 201 });
}
