import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact } from "@/lib/rolodex-store";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; interactionId: string }> }) {
  const { id, interactionId } = await params;
  const contact = getContact(id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await req.json();
  const interactions = contact.interactions.map(i => i.id === interactionId ? { ...i, ...data } : i);
  const updated = updateContact(id, { interactions });
  return NextResponse.json({ contact: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; interactionId: string }> }) {
  const { id, interactionId } = await params;
  const contact = getContact(id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const interactions = contact.interactions.filter(i => i.id !== interactionId);
  const updated = updateContact(id, { interactions });
  return NextResponse.json({ contact: updated });
}
