import { NextResponse } from "next/server";
import { createRolodexContact, getRolodexContacts, type RolodexContactInput } from "@/lib/rolodex-store";

export async function GET() {
  return NextResponse.json(await getRolodexContacts());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RolodexContactInput;
    const contact = await createRolodexContact(body);
    if (!contact) {
      return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
    }
    return NextResponse.json(contact, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create contact." }, { status: 500 });
  }
}
