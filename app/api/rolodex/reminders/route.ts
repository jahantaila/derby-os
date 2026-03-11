import { NextResponse } from "next/server";
import { getRolodexReminders } from "@/lib/rolodex-store";

export async function GET() {
  return NextResponse.json(await getRolodexReminders());
}
