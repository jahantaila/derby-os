import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  status?: string;
  currentTask?: string;
  model?: string;
  avatar?: string;
  type?: string;
};

type PatchBody = {
  id?: string;
  status?: "sleeping" | "working" | "water-cooler";
  currentTask?: string;
};

const FILE = "team.json";
const ALLOWED = new Set(["sleeping", "working", "water-cooler"]);

export async function PATCH(req: Request) {
  let body: PatchBody;

  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Field 'id' is required" }, { status: 400 });
  }

  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "Field 'status' must be one of sleeping|working|water-cooler" }, { status: 400 });
  }

  const team = readData<TeamMember[]>(FILE, []);
  const idx = team.findIndex((member) => member.id === body.id);

  if (idx === -1) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  const updated: TeamMember = {
    ...team[idx],
    status: body.status,
    ...(typeof body.currentTask === "string" ? { currentTask: body.currentTask } : {}),
  };

  team[idx] = updated;
  writeData(FILE, team);

  return NextResponse.json(updated);
}
