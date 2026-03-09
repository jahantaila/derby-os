import { NextResponse } from "next/server";
import { importInterestedInstantlyLeads } from "@/lib/instantly";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await importInterestedInstantlyLeads());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import Instantly leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
