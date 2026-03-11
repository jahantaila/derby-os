import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/notifications";

export async function GET() {
  return NextResponse.json(await getNotifications());
}
