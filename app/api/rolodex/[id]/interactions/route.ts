import { NextResponse } from "next/server";
import { addRolodexInteraction, type InteractionInput } from "@/lib/rolodex-store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as InteractionInput;
    if (!body.summary?.trim()) {
      return NextResponse.json({ error: "Interaction summary is required." }, { status: 400 });
    }
    const result = await addRolodexInteraction(params.id, body);
    if (!result) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to add interaction." }, { status: 500 });
  }
}
