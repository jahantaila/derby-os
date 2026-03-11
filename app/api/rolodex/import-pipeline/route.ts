import { NextResponse } from "next/server";
import { importPipelineContacts } from "@/lib/rolodex-store";

type ImportBody = {
  dealIds?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ImportBody;
    return NextResponse.json(await importPipelineContacts(body));
  } catch {
    return NextResponse.json({ error: "Unable to import pipeline contacts." }, { status: 500 });
  }
}
