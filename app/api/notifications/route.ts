import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/notifications";

export async function GET() {
  try {
    return NextResponse.json(await getNotifications());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
