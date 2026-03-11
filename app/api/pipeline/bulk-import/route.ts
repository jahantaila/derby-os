import { NextResponse } from "next/server";
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

    return NextResponse.json(await bulkImportPipelineDeals(contacts));
  } catch {
    return NextResponse.json({ error: "Unable to import leads." }, { status: 500 });
  }
}
