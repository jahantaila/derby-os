import { NextResponse } from "next/server";
import { seedRolodexContacts } from "@/lib/rolodex-store";

export async function POST() {
  try {
    const result = await seedRolodexContacts();
    return NextResponse.json(result, { status: result.seeded ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Unable to seed rolodex contacts." }, { status: 500 });
  }
}
