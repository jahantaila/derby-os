import { NextResponse } from "next/server";
import { buildMorningSummary } from "@/lib/pipeline-dashboard";
import { getPipelineDeals } from "@/lib/pipeline-store";

export async function GET() {
  const deals = await getPipelineDeals();
  return NextResponse.json(buildMorningSummary(deals));
}
