import { NextResponse } from "next/server";
import { deleteRolodexInteraction, type InteractionInput, updateRolodexInteraction } from "@/lib/rolodex-store";

export async function PATCH(request: Request, { params }: { params: { id: string; interactionId: string } }) {
  try {
    const body = (await request.json()) as InteractionInput | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid interaction payload." }, { status: 400 });
    }
    if ("summary" in body && !body.summary?.trim()) {
      return NextResponse.json({ error: "Interaction summary is required." }, { status: 400 });
    }
    const contact = await updateRolodexInteraction(params.id, params.interactionId, body);
    if (!contact) {
      return NextResponse.json({ error: "Interaction not found." }, { status: 404 });
    }
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Unable to update interaction." }, { status: 500 });
  }
}

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
