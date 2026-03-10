import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PIPELINE_ASSIGNEES, PIPELINE_STAGES, PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

type CreateDealInput = {
  name?: string;
  stage?: PipelineStage;
  value?: number | string;
  client?: string;
  contact?: string;
  assignee?: string;
  notes?: string;
  source?: string;
  email?: string;
  phone?: string;
  website?: string;
  competitor?: string;
  tags?: string[];
};

const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);

function buildDealId() {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

function normalizeSource(value: unknown): string {
  if (typeof value !== "string") return "manual";
  const normalized = value.trim().toLowerCase();
  return normalized || "manual";
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(value: unknown, competitor?: string): string[] {
  const tags = Array.isArray(value) ? value : [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  tags.forEach((entry) => {
    const tag = normalizeString(entry);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return;
    seen.add(key);
    normalized.push(tag);
  });

  const competitorTag = normalizeString(competitor);
  const competitorKey = competitorTag.toLowerCase();
  if (competitorTag && !seen.has(competitorKey)) {
    normalized.push(competitorTag);
  }

  return normalized;
}

export async function GET() {
  return NextResponse.json(await getPipelineDeals());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateDealInput;
    const name = body.name?.trim();
    const client = body.client?.trim();

    if (!name || !client) {
      return NextResponse.json({ error: "Lead name and client are required." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const competitor = normalizeString(body.competitor) || undefined;
    const deal: PipelineDeal = {
      id: buildDealId(),
      name,
      stage: isStage(body.stage) ? body.stage : "new-lead",
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
      enrichmentData:
        normalizeString(body.phone) || normalizeString(body.website)
          ? {
              ...(normalizeString(body.phone) ? { phone: normalizeString(body.phone) } : {}),
              ...(normalizeString(body.website) ? { website: normalizeString(body.website) } : {}),
            }
          : null,
      phoneLog: [],
      tags: normalizeTags(body.tags, competitor),
      competitor,
      website: normalizeString(body.website) || undefined,
      stageUpdatedAt: today,
    };

    const deals = await getPipelineDeals();
    deals.push(deal);
    await writePipelineDeals(deals);

    return NextResponse.json(deal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create lead." }, { status: 500 });
  }
}
