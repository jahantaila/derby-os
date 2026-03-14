import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact } from "@/lib/rolodex-store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = getContact(id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await req.json();
  const interaction = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
  const updated = updateContact(id, {
    interactions: [...contact.interactions, interaction],
    lastContactedAt: data.date ?? new Date().toISOString(),
  });
  return NextResponse.json({ contact: updated, interaction }, { status: 201 });
}
