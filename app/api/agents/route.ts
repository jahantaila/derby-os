import { NextResponse } from "next/server";
import { getAgents, TeamMemberType } from "@/lib/agents";

const ALLOWED_TYPES = new Set<TeamMemberType>(["agent", "employee", "ceo"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type && !ALLOWED_TYPES.has(type as TeamMemberType)) {
    return NextResponse.json({ error: "type must be one of agent|employee|ceo" }, { status: 400 });
  }

  return NextResponse.json(await getAgents((type as TeamMemberType | null) ?? undefined));
}
