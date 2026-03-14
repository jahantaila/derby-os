import { NextResponse } from "next/server";
import { getAllContacts } from "@/lib/rolodex-store";

export async function POST() {
  // Seed happens automatically on first read
  const contacts = getAllContacts();
  return NextResponse.json({ seeded: true, count: contacts.length });
}
