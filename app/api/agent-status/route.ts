import { NextResponse } from "next/server";
import { getLiveOfficeAgents } from "@/lib/office-live";

export async function GET() {
  const agents = await getLiveOfficeAgents();
  return NextResponse.json(agents, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
