import { NextResponse } from "next/server";
import { getAgents } from "@/lib/agents";

export async function GET() {
  return NextResponse.json(getAgents());
}
