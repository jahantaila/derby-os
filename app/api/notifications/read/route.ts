import { NextResponse } from "next/server";
import { markNotificationsRead } from "@/lib/notifications";

type MarkReadInput = {
  ids?: string[];
  all?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MarkReadInput;
    return NextResponse.json(await markNotificationsRead(body));
  } catch {
    return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}
