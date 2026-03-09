import { NextResponse } from "next/server";
import { importInterestedInstantlyLeads } from "@/lib/instantly";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization")?.trim();
  return header === `Bearer ${secret}` || header === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await importInterestedInstantlyLeads());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run Instantly cron import.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
