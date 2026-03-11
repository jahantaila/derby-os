import { NextResponse } from "next/server";
import { archiveRolodexContact, getRolodexContactById, updateRolodexContact, type RolodexContactInput } from "@/lib/rolodex-store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const contact = await getRolodexContactById(params.id);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  return NextResponse.json(contact);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await request.json()) as RolodexContactInput;
    const contact = await updateRolodexContact(params.id, patch);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Unable to update contact." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const archived = await archiveRolodexContact(params.id);
    if (!archived) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, contact: archived });
  } catch {
    return NextResponse.json({ error: "Unable to archive contact." }, { status: 500 });
  }
}
