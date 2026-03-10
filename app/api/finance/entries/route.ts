import { NextResponse } from "next/server";
import { ensureMonth, getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceLedgerRow } from "@/lib/finance-types";

type SectionKey = "income" | "expenses" | "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses";

type CreateEntryBody = {
  month?: string;
  clientId?: string;
  section?: SectionKey;
  row?: Partial<FinanceLedgerRow>;
};

function isSection(value: unknown): value is SectionKey {
  return value === "income" || value === "expenses" || value === "recurringExpenses" || value === "employeeExpenses" || value === "oneTimeExpenses";
}

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toRecurring(value: unknown): "M" | "1-time" {
  return value === "M" ? "M" : "1-time";
}

function buildRow(row: Partial<FinanceLedgerRow> | undefined): FinanceLedgerRow {
  return {
    id: crypto.randomUUID(),
    name: toString(row?.name),
    date: toString(row?.date),
    recurring: toRecurring(row?.recurring),
    notes: toString(row?.notes),
    amount: Math.max(0, toNumber(row?.amount)),
  };
}

export async function POST(request: Request) {
  let body: CreateEntryBody;

  try {
    body = (await request.json()) as CreateEntryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
    return NextResponse.json({ error: "Field 'month' must be YYYY-MM" }, { status: 400 });
  }

  if (!isSection(body.section)) {
    return NextResponse.json({ error: "Field 'section' is invalid" }, { status: 400 });
  }

  let data = await getFinanceData();
  data = ensureMonth(data, body.month);

  const created = buildRow(body.row);

  if (body.section === "income" || body.section === "expenses") {
    if (!body.clientId) {
      return NextResponse.json({ error: "Field 'clientId' is required for client sections" }, { status: 400 });
    }

    const client = data.clients.find((entry) => entry.id === body.clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const monthData = client.months[body.month];
    monthData[body.section].push(created);
    await writeFinanceData(data);
    return NextResponse.json(created, { status: 201 });
  }

  const generalMonth = data.generalData.months[body.month];
  generalMonth[body.section].push(created);

  await writeFinanceData(data);
  return NextResponse.json(created, { status: 201 });
}
