import { NextResponse } from "next/server";
import { previewInterestedInstantlyLeads } from "@/lib/instantly";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await previewInterestedInstantlyLeads());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync Instantly leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
