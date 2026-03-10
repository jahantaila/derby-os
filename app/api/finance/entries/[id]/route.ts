import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { ExpenseCategory, RevenueCategory } from "@/lib/finance-types";

type SectionKey = "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses" | "revenues";

type UpdateEntryBody = {
  month?: string;
  section?: SectionKey;
  row?: Record<string, unknown>;
};

function isSection(value: unknown): value is SectionKey {
  return value === "recurringExpenses" || value === "employeeExpenses" || value === "oneTimeExpenses" || value === "revenues";
}

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return value === "other" || value === "fulfillment" || value === "marketing" || value === "hosting";
}

function isRevenueCategory(value: unknown): value is RevenueCategory {
  return value === "retainer" || value === "project" || value === "ad management" || value === "other";
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

  const data = await getFinanceData();
  const monthData = data.months[body.month];
  if (!monthData) {
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  }

  const row = typeof body.row === "object" && body.row !== null ? body.row : {};
  const id = context.params.id;

  if (body.section === "recurringExpenses") {
    const index = monthData.recurringExpenses.findIndex((entry) => entry.id === id);
    if (index === -1) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    const existing = monthData.recurringExpenses[index];
    monthData.recurringExpenses[index] = {
      ...existing,
      name: row.name === undefined ? existing.name : toString(row.name),
      date: row.date === undefined ? existing.date : toString(row.date),
      type: row.type === undefined ? existing.type : isExpenseCategory(row.type) ? row.type : existing.type,
      recurring: row.recurring === undefined ? existing.recurring : toString(row.recurring),
      notes: row.notes === undefined ? existing.notes : toString(row.notes),
      price: row.price === undefined ? existing.price : Math.max(0, toNumber(row.price)),
    };
    data.months[body.month] = monthData;
    await writeFinanceData(data);
    return NextResponse.json(monthData.recurringExpenses[index]);
  }

  if (body.section === "employeeExpenses") {
    const index = monthData.employeeExpenses.findIndex((entry) => entry.id === id);
    if (index === -1) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    const existing = monthData.employeeExpenses[index];
    monthData.employeeExpenses[index] = {
      ...existing,
      name: row.name === undefined ? existing.name : toString(row.name),
      date: row.date === undefined ? existing.date : toString(row.date),
      notes: row.notes === undefined ? existing.notes : toString(row.notes),
      price: row.price === undefined ? existing.price : Math.max(0, toNumber(row.price)),
      extraNotes: row.extraNotes === undefined ? existing.extraNotes : toString(row.extraNotes),
    };
    data.months[body.month] = monthData;
    await writeFinanceData(data);
    return NextResponse.json(monthData.employeeExpenses[index]);
  }

  if (body.section === "oneTimeExpenses") {
    const index = monthData.oneTimeExpenses.findIndex((entry) => entry.id === id);
    if (index === -1) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    const existing = monthData.oneTimeExpenses[index];
    monthData.oneTimeExpenses[index] = {
      ...existing,
      name: row.name === undefined ? existing.name : toString(row.name),
      date: row.date === undefined ? existing.date : toString(row.date),
      notes: row.notes === undefined ? existing.notes : toString(row.notes),
      price: row.price === undefined ? existing.price : Math.max(0, toNumber(row.price)),
    };
    data.months[body.month] = monthData;
    await writeFinanceData(data);
    return NextResponse.json(monthData.oneTimeExpenses[index]);
  }

  const index = monthData.revenues.findIndex((entry) => entry.id === id);
  if (index === -1) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  const existing = monthData.revenues[index];
  const stripeFeeRaw = row.stripeFee;
  monthData.revenues[index] = {
    ...existing,
    clientName: row.clientName === undefined ? existing.clientName : toString(row.clientName),
    amount: row.amount === undefined ? existing.amount : Math.max(0, toNumber(row.amount)),
    date: row.date === undefined ? existing.date : toString(row.date),
    type: row.type === undefined ? existing.type : isRevenueCategory(row.type) ? row.type : existing.type,
    notes: row.notes === undefined ? existing.notes : toString(row.notes),
    stripeFee:
      row.stripeFee === undefined
        ? existing.stripeFee
        : stripeFeeRaw === null || stripeFeeRaw === ""
          ? null
          : Math.max(0, toNumber(stripeFeeRaw)),
  };

  data.months[body.month] = monthData;
  await writeFinanceData(data);
  return NextResponse.json(monthData.revenues[index]);
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const section = searchParams.get("section");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Query 'month' must be YYYY-MM" }, { status: 400 });
  }

  if (!isSection(section)) {
    return NextResponse.json({ error: "Query 'section' is invalid" }, { status: 400 });
  }

  const data = await getFinanceData();
  const monthData = data.months[month];
  if (!monthData) return NextResponse.json({ error: "Month not found" }, { status: 404 });

  const id = context.params.id;
  const before =
    section === "recurringExpenses"
      ? monthData.recurringExpenses.length
      : section === "employeeExpenses"
        ? monthData.employeeExpenses.length
        : section === "oneTimeExpenses"
          ? monthData.oneTimeExpenses.length
          : monthData.revenues.length;

  if (section === "recurringExpenses") {
    monthData.recurringExpenses = monthData.recurringExpenses.filter((entry) => entry.id !== id);
  } else if (section === "employeeExpenses") {
    monthData.employeeExpenses = monthData.employeeExpenses.filter((entry) => entry.id !== id);
  } else if (section === "oneTimeExpenses") {
    monthData.oneTimeExpenses = monthData.oneTimeExpenses.filter((entry) => entry.id !== id);
  } else {
    monthData.revenues = monthData.revenues.filter((entry) => entry.id !== id);
  }

  const after =
    section === "recurringExpenses"
      ? monthData.recurringExpenses.length
      : section === "employeeExpenses"
        ? monthData.employeeExpenses.length
        : section === "oneTimeExpenses"
          ? monthData.oneTimeExpenses.length
          : monthData.revenues.length;

  if (before === after) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  data.months[month] = monthData;
  await writeFinanceData(data);
  return NextResponse.json({ ok: true });
}
