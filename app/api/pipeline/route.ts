import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PIPELINE_ASSIGNEES, PIPELINE_STAGES, PipelineDeal, PipelineSource, PipelineStage } from "@/lib/pipeline-types";

type CreateDealInput = {
  name?: string;
  stage?: PipelineStage;
  value?: number | string;
  client?: string;
  contact?: string;
  assignee?: string;
  notes?: string;
  source?: PipelineSource;
  email?: string;
};

const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);
const VALID_SOURCES = new Set<PipelineSource>(["instantly", "manual", "referral", "website"]);

function buildDealId() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function isStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && VALID_STAGES.has(value as PipelineStage);
}

function normalizeAssignee(value: unknown): string {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (VALID_ASSIGNEES.has(normalized)) return normalized;
  }
  return "jahan";
}

function normalizeValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

function normalizeSource(value: unknown): PipelineSource {
  return typeof value === "string" && VALID_SOURCES.has(value as PipelineSource) ? (value as PipelineSource) : "manual";
}

export async function GET() {
  return NextResponse.json(getPipelineDeals());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateDealInput;
    const name = body.name?.trim();
    const client = body.client?.trim();

    if (!name || !client) {
      return NextResponse.json({ error: "Deal name and client are required." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const deal: PipelineDeal = {
      id: buildDealId(),
      name,
      stage: isStage(body.stage) ? body.stage : "lead",
      value: normalizeValue(body.value),
      client,
      contact: body.contact?.trim() ?? "",
      assignee: normalizeAssignee(body.assignee),
      createdAt: today,
      notes: body.notes?.trim() ?? "",
      status: "new",
      source: normalizeSource(body.source),
      email: body.email?.trim() ?? "",
      enrichmentStatus: "pending",
      enrichmentData: null,
      stageUpdatedAt: today,
    };

    const deals = getPipelineDeals();
    deals.push(deal);
    writePipelineDeals(deals);

    return NextResponse.json(deal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create deal." }, { status: 500 });
  }
}
