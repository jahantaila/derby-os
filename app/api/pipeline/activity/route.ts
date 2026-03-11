import { NextResponse } from "next/server";
import { getPipelineActivity } from "@/lib/pipeline-activity";

export async function GET() {
  return NextResponse.json(await getPipelineActivity(20));
}
