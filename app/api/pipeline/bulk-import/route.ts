import { NextResponse } from "next/server";
import { appendPipelineActivity, createLeadCreatedActivity, createStageChangedActivity } from "@/lib/pipeline-activity";
import { bulkImportPipelineDeals, PipelineDealUpsertInput } from "@/lib/pipeline-store";

type BulkImportBody = {
  contacts?: PipelineDealUpsertInput[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BulkImportBody | PipelineDealUpsertInput[];
    const contacts = Array.isArray(body) ? body : body.contacts;

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: "contacts array is required." }, { status: 400 });
    }

    const result = await bulkImportPipelineDeals(contacts);
    const activityEntries = [
      ...result.createdDeals.map(createLeadCreatedActivity),
      ...result.updatedDeals
        .filter((entry) => entry.previous.stage !== entry.next.stage)
        .map((entry) => createStageChangedActivity(entry.previous, entry.next)),
    ];
    if (activityEntries.length) {
      await appendPipelineActivity(activityEntries);
    }

    return NextResponse.json({
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
    });
  } catch {
    return NextResponse.json({ error: "Unable to import leads." }, { status: 500 });
  }
}
