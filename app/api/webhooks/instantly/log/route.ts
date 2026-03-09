import { NextResponse } from "next/server";
import { getInstantlyWebhookLog } from "@/lib/webhook-log";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getInstantlyWebhookLog().slice(0, 50));
}
