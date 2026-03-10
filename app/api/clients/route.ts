import { NextResponse } from "next/server";
import { ClientProfile } from "@/lib/client-types";
import { deleteClientProfile, getClients, upsertClient } from "@/lib/clients-store";

export const dynamic = "force-dynamic";

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

function toClientType(value: unknown): ClientProfile["clientType"] {
  if (value === "restaurant" || value === "home-service" || value === "gaming") return value;
  return "other";
}

function toClientPayload(body: unknown): ClientProfile | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const id = toString(input.id) || crypto.randomUUID();
  const name = toString(input.name);
  if (!name) return null;

  return {
    id,
    name,
    clientType: toClientType(input.clientType),
    contactName: toString(input.contactName) || undefined,
    email: toString(input.email) || undefined,
    phone: toString(input.phone) || undefined,
    website: toString(input.website) || undefined,
    address: toString(input.address) || undefined,
    services: Array.isArray(input.services) ? (input.services as string[]) : [],
    monthlyRetainer: Math.max(0, toNumber(input.monthlyRetainer)),
    monthlyBudgetRange:
      input.monthlyBudgetRange === "Under $500" ||
      input.monthlyBudgetRange === "$500-$1k" ||
      input.monthlyBudgetRange === "$1k-$2k" ||
      input.monthlyBudgetRange === "$2k-$5k" ||
      input.monthlyBudgetRange === "$5k+"
        ? input.monthlyBudgetRange
        : undefined,
    startDate: toString(input.startDate) || undefined,
    status: input.status === "inactive" || input.status === "paused" ? input.status : "active",
    notes: toString(input.notes) || undefined,
    createdAt: toString(input.createdAt) || new Date().toISOString(),
  };
}

export async function GET() {
  return NextResponse.json(await getClients());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = toClientPayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  }

  const updated = await upsertClient(payload);
  const created = updated.find((entry) => entry.id === payload.id);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = toClientPayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Missing required field: id or name" }, { status: 400 });
  }

  const updated = await upsertClient(payload);
  const client = updated.find((entry) => entry.id === payload.id);
  return NextResponse.json(client ?? null);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = toString(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });

  await deleteClientProfile(id);
  return NextResponse.json({ ok: true });
}
