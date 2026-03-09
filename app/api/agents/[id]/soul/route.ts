import fs from "fs";
import { NextResponse } from "next/server";
import { getSoulPath } from "@/lib/agents";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const soulPath = getSoulPath(params.id);

  if (!soulPath) {
    return NextResponse.json({
      id: params.id,
      content: "Human team member - no SOUL file",
    });
  }

  if (!fs.existsSync(soulPath)) {
    return NextResponse.json({ error: "SOUL file not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: params.id,
    content: fs.readFileSync(soulPath, "utf-8"),
  });
}
