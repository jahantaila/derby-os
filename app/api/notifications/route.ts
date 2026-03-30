import { NextResponse } from "next/server";

export async function GET() {
  // Notifications table doesn't exist yet - return empty array
  return NextResponse.json([]);
}
