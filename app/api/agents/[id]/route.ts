import { NextResponse } from "next/server";
import { patchAgentById } from "@/lib/agents";

type PatchBody = {
  status?: "active" | "working" | "idle" | "offline";
  currentTask?: string;
};

const ALLOWED_STATUS = new Set(["active", "working", "idle", "offline"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: PatchBody;

  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hasStatus = typeof body.status === "string";
  const hasTask = typeof body.currentTask === "string";

  if (!hasStatus && !hasTask) {
    return NextResponse.json({ error: "Provide at least one field: status or currentTask" }, { status: 400 });
  }

  if (hasStatus && !ALLOWED_STATUS.has(body.status as string)) {
    return NextResponse.json({ error: "status must be one of active|working|idle|offline" }, { status: 400 });
  }

  const updated = await patchAgentById(params.id, body);
  if (!updated) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
