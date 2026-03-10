import { NextResponse } from "next/server";
import { checkRedisConnection } from "@/lib/persistence";

export const dynamic = "force-dynamic";

export async function GET() {
  const redis = await checkRedisConnection();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    pages: 37,
    redis,
  });
}
