import { NextResponse } from "next/server";
import { getAgentById } from "@/lib/agents";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const agent = await getAgentById(params.id);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: params.id,
    content: agent.soul,
  });
}
