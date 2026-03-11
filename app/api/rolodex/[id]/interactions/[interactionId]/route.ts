import { NextResponse } from "next/server";
import { deleteRolodexInteraction } from "@/lib/rolodex-store";

export async function DELETE(_: Request, { params }: { params: { id: string; interactionId: string } }) {
  try {
    const contact = await deleteRolodexInteraction(params.id, params.interactionId);
    if (!contact) {
      return NextResponse.json({ error: "Interaction not found." }, { status: 404 });
    }
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Unable to delete interaction." }, { status: 500 });
  }
}
