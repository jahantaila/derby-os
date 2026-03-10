import { NextResponse } from "next/server";
import { ensureMonth, getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { FinanceLedgerRow } from "@/lib/finance-types";

type SectionKey = "income" | "expenses" | "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses";

type UpdateEntryBody = {
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

function updateRow(existing: FinanceLedgerRow, patch: Partial<FinanceLedgerRow> | undefined): FinanceLedgerRow {
  return {
    ...existing,
    name: patch?.name === undefined ? existing.name : toString(patch.name),
    date: patch?.date === undefined ? existing.date : toString(patch.date),
    recurring: patch?.recurring === undefined ? existing.recurring : toRecurring(patch.recurring),
    notes: patch?.notes === undefined ? existing.notes : toString(patch.notes),
    amount: patch?.amount === undefined ? existing.amount : Math.max(0, toNumber(patch.amount)),
  };
}

function updateSectionRows(rows: FinanceLedgerRow[], id: string, patch: Partial<FinanceLedgerRow> | undefined): FinanceLedgerRow | null {
  const index = rows.findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  const updated = updateRow(rows[index], patch);
  rows[index] = updated;
  return updated;
}

function deleteSectionRow(rows: FinanceLedgerRow[], id: string): boolean {
  const before = rows.length;
  const filtered = rows.filter((entry) => entry.id !== id);
  rows.splice(0, rows.length, ...filtered);
  return filtered.length !== before;
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  let body: UpdateEntryBody;

  try {
    body = (await request.json()) as UpdateEntryBody;
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

  const id = context.params.id;

  if (body.section === "income" || body.section === "expenses") {
    if (!body.clientId) {
      return NextResponse.json({ error: "Field 'clientId' is required for client sections" }, { status: 400 });
    }

    const client = data.clients.find((entry) => entry.id === body.clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const monthData = client.months[body.month];
    const updated = updateSectionRows(monthData[body.section], id, body.row);
    if (!updated) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    await writeFinanceData(data);
    return NextResponse.json(updated);
  }

  const generalMonth = data.generalData.months[body.month];
  const updated = updateSectionRows(generalMonth[body.section], id, body.row);
  if (!updated) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  await writeFinanceData(data);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const section = searchParams.get("section");
  const clientId = searchParams.get("clientId");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Query 'month' must be YYYY-MM" }, { status: 400 });
  }

  if (!isSection(section)) {
    return NextResponse.json({ error: "Query 'section' is invalid" }, { status: 400 });
  }

  let data = await getFinanceData();
  data = ensureMonth(data, month);

  const id = context.params.id;

  if (section === "income" || section === "expenses") {
    if (!clientId) {
      return NextResponse.json({ error: "Query 'clientId' is required for client sections" }, { status: 400 });
    }

    const client = data.clients.find((entry) => entry.id === clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const removed = deleteSectionRow(client.months[month][section], id);
    if (!removed) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    await writeFinanceData(data);
    return NextResponse.json({ ok: true });
  }

  const removed = deleteSectionRow(data.generalData.months[month][section], id);
  if (!removed) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  await writeFinanceData(data);
  return NextResponse.json({ ok: true });
}
