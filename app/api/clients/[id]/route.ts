import { NextResponse } from "next/server";
import { getClientById, upsertClient } from "@/lib/clients-store";
import { toClientPayload } from "@/app/api/clients/route";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const client = await getClientById(params.id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await getClientById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const payload = toClientPayload({ ...existing, ...(body as Record<string, unknown>), id: params.id });
  if (!payload) {
    return NextResponse.json({ error: "Invalid client payload" }, { status: 400 });
  }

  const updated = await upsertClient(payload);
  const client = updated.find((entry) => entry.id === params.id);
  return NextResponse.json(client ?? null);
}
