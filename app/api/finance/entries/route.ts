import { NextResponse } from "next/server";
import { getFinanceData, writeFinanceData } from "@/lib/finance-store";
import { ExpenseCategory, RevenueCategory } from "@/lib/finance-types";

type SectionKey = "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses" | "revenues";

type CreateEntryBody = {
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

function emptyMonth(month: string) {
  return {
    month,
    goalAmount: 15000,
    recurringExpenses: [],
    employeeExpenses: [],
    oneTimeExpenses: [],
    revenues: [],
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

  const row = typeof body.row === "object" && body.row !== null ? body.row : {};
  const data = await getFinanceData();
  const monthData = data.months[body.month] ?? emptyMonth(body.month);

  if (body.section === "recurringExpenses") {
    const created = {
      id: crypto.randomUUID(),
      name: toString(row.name),
      date: toString(row.date),
      type: isExpenseCategory(row.type) ? row.type : "other",
      recurring: toString(row.recurring) || "M",
      notes: toString(row.notes),
      price: Math.max(0, toNumber(row.price)),
    };
    monthData.recurringExpenses.push(created);
    data.months[body.month] = monthData;
    await writeFinanceData(data);
    return NextResponse.json(created, { status: 201 });
  }

  if (body.section === "employeeExpenses") {
    const created = {
      id: crypto.randomUUID(),
      name: toString(row.name),
      date: toString(row.date),
      notes: toString(row.notes),
      price: Math.max(0, toNumber(row.price)),
      extraNotes: toString(row.extraNotes),
    };
    monthData.employeeExpenses.push(created);
    data.months[body.month] = monthData;
    await writeFinanceData(data);
    return NextResponse.json(created, { status: 201 });
  }

  if (body.section === "oneTimeExpenses") {
    const created = {
      id: crypto.randomUUID(),
      name: toString(row.name),
      date: toString(row.date),
      notes: toString(row.notes),
      price: Math.max(0, toNumber(row.price)),
    };
    monthData.oneTimeExpenses.push(created);
    data.months[body.month] = monthData;
    await writeFinanceData(data);
    return NextResponse.json(created, { status: 201 });
  }

  const stripeFeeRaw = row.stripeFee;
  const created = {
    id: crypto.randomUUID(),
    clientName: toString(row.clientName),
    amount: Math.max(0, toNumber(row.amount)),
    date: toString(row.date),
    type: isRevenueCategory(row.type) ? row.type : "other",
    notes: toString(row.notes),
    stripeFee: stripeFeeRaw === null || stripeFeeRaw === "" ? null : Math.max(0, toNumber(stripeFeeRaw)),
  };

  monthData.revenues.push(created);
  data.months[body.month] = monthData;
  await writeFinanceData(data);
  return NextResponse.json(created, { status: 201 });
}
