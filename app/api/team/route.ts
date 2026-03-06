import { NextResponse } from "next/server";
import { readData, writeData } from "@/lib/data";
import { seedTeam } from "@/lib/seed";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  status: string;
  currentTask?: string;
  model?: string;
  avatar?: string;
  type?: string;
};

const FILE = "team.json";
const REQUIRED_TEAM: TeamMember[] = [
  { id: "tm1", name: "Jahan", role: "Founder & CEO", status: "sleeping", currentTask: "Out for the night", model: "Human", avatar: "🧑‍💼", type: "human" },
  { id: "tm2", name: "Kimberly", role: "Chief of Staff", status: "working", currentTask: "Running Mission Control", model: "Claude Opus", avatar: "👩‍💻", type: "agent" },
  { id: "tm3", name: "Kevin", role: "Developer", status: "working", currentTask: "Rebuilding the Office screen", model: "GPT-5", avatar: "🧑‍💻", type: "agent" },
];

function isGenericStatus(value: string | undefined) {
  const status = (value || "").toLowerCase();
  return status === "" || status === "active" || status === "idle";
}

function normalizeTeam(input: TeamMember[]): TeamMember[] {
  const existing = [...input];
  const byName = new Map(existing.map((member) => [member.name.toLowerCase(), member]));

  for (const required of REQUIRED_TEAM) {
    const found = byName.get(required.name.toLowerCase());
    if (!found) {
      existing.push(required);
      continue;
    }

    const merged: TeamMember = {
      ...required,
      ...found,
      status: isGenericStatus(found.status) ? required.status : found.status,
    };

    const idx = existing.findIndex((member) => member.id === found.id);
    existing[idx] = merged;
  }

  const order = new Map(REQUIRED_TEAM.map((member, i) => [member.name.toLowerCase(), i]));
  return existing.sort((a, b) => {
    const ai = order.has(a.name.toLowerCase()) ? (order.get(a.name.toLowerCase()) as number) : 99;
    const bi = order.has(b.name.toLowerCase()) ? (order.get(b.name.toLowerCase()) as number) : 99;
    return ai - bi;
  });
}

export async function GET() {
  let data = readData<TeamMember[]>(FILE, []);
  if (data.length === 0) data = seedTeam as TeamMember[];
  const normalized = normalizeTeam(data);
  writeData(FILE, normalized);
  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = readData<TeamMember[]>(FILE, []);
  const item = { ...body, id: body.id || `${Date.now()}` } as TeamMember;
  data.push(item);
  writeData(FILE, data);
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const body = await req.json();
  let data = readData<TeamMember[]>(FILE, []);
  data = data.map((member) => (member.id === body.id ? { ...member, ...body } : member));
  writeData(FILE, data);
  return NextResponse.json(body);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  let data = readData<TeamMember[]>(FILE, []);
  data = data.filter((member) => member.id !== id);
  writeData(FILE, data);
  return NextResponse.json({ ok: true });
}
