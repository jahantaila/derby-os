import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, createContact } from "@/lib/rolodex-store";

// GET /api/rolodex — list all contacts
export async function GET(req: NextRequest) {
  const contacts = getAllContacts();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase();
  const type = searchParams.get("type");
  const group = searchParams.get("group");
  const tag = searchParams.get("tag");
  const archived = searchParams.get("archived") === "true";

  let result = contacts.filter(c => c.archived === archived);

  if (q) {
    result = result.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }
  if (type) result = result.filter(c => c.relationshipType === type);
  if (group) result = result.filter(c => (c.groups ?? []).includes(group));
  if (tag) result = result.filter(c => c.tags.includes(tag));

  return NextResponse.json({ contacts: result, total: result.length });
}

// POST /api/rolodex — create a contact
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.firstName && !data.lastName && !data.email) {
      return NextResponse.json({ error: "At least firstName, lastName, or email required" }, { status: 400 });
    }
    const contact = createContact(data);
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Invalid request" }, { status: 400 });
  }
}
