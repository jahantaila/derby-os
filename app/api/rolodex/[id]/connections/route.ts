import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact } from "@/lib/rolodex-store";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = getContact(id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { connections } = await req.json();
  const updated = updateContact(id, { connections });
  return NextResponse.json({ contact: updated });
}
