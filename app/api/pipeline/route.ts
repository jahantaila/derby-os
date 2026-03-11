import { NextResponse } from "next/server";
import { enrichDeal, isEnrichableDeal } from "@/lib/enrich-utils";
import { appendPipelineActivity, createLeadCreatedActivity, createStageChangedActivity } from "@/lib/pipeline-activity";
import { getPipelineDeals, PipelineDealUpsertInput, upsertPipelineDealByEmail } from "@/lib/pipeline-store";

export async function GET() {
  return NextResponse.json(await getPipelineDeals());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PipelineDealUpsertInput;
    const name = body.name?.trim();
    const client = body.client?.trim();

    if (!name || !client) {
      return NextResponse.json({ error: "Lead name and client are required." }, { status: 400 });
    }

    const previousDeals = body.email ? await getPipelineDeals() : [];
    const previousDeal =
      body.email?.trim().toLowerCase()
        ? previousDeals.find((deal) => deal.email.trim().toLowerCase() === body.email?.trim().toLowerCase())
        : null;

    const result = await upsertPipelineDealByEmail(body);
    if (!result) {
      return NextResponse.json({ error: "Lead name and client are required." }, { status: 400 });
    }

    if (result.action === "created") {
      await appendPipelineActivity(createLeadCreatedActivity(result.deal));
    }

    if (result.action === "updated" && previousDeal && previousDeal.stage !== result.deal.stage) {
      await appendPipelineActivity(createStageChangedActivity(previousDeal, result.deal));
    }

    let responseDeal = result.deal;

    if (result.action === "created" && isEnrichableDeal(result.deal)) {
      try {
        responseDeal = (await enrichDeal(result.deal.id)) ?? result.deal;
      } catch (error) {
        console.error(`Pipeline auto-enrichment failed for deal ${result.deal.id}`, error);
      }
    }

    return NextResponse.json(responseDeal, { status: result.action === "created" ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Unable to create lead." }, { status: 500 });
  }
}
