import { NextResponse } from "next/server";
import { updateRolodexConnections } from "@/lib/rolodex-store";

type ConnectionsBody = {
  add?: string[];
  remove?: string[];
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json().catch(() => ({}))) as ConnectionsBody;
    const contact = await updateRolodexConnections(params.id, body);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Unable to update connections." }, { status: 500 });
  }
}
