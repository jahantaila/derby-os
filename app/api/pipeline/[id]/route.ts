import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import {
  EnrichmentStatus,
  PIPELINE_ASSIGNEES,
  PIPELINE_STAGES,
  PipelineDeal,
  PipelineSource,
  PipelineStage,
} from "@/lib/pipeline-types";

type UpdateDealInput = Partial<Omit<PipelineDeal, "id" | "createdAt">>;

const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);
const VALID_SOURCES = new Set<PipelineSource>(["instantly", "manual", "referral", "website"]);
const VALID_ENRICHMENT_STATUS = new Set<EnrichmentStatus>(["pending", "enriched", "failed"]);

function isStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && VALID_STAGES.has(value as PipelineStage);
}

function normalizeAssignee(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return VALID_ASSIGNEES.has(normalized) ? normalized : undefined;
}

function normalizeValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return undefined;
}

function normalizeSource(value: unknown): PipelineSource | undefined {
  if (typeof value !== "string") return undefined;
  return VALID_SOURCES.has(value as PipelineSource) ? (value as PipelineSource) : undefined;
}

function normalizeEnrichmentStatus(value: unknown): EnrichmentStatus | undefined {
  if (typeof value !== "string") return undefined;
  return VALID_ENRICHMENT_STATUS.has(value as EnrichmentStatus) ? (value as EnrichmentStatus) : undefined;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const deal = getPipelineDeals().find((item) => item.id === params.id);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
  return NextResponse.json(deal);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const patch = (await request.json()) as UpdateDealInput;
    const deals = getPipelineDeals();
    const index = deals.findIndex((deal) => deal.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    const current = deals[index];
    const nextStage = isStage(patch.stage) ? patch.stage : current.stage;
    const stageChanged = nextStage !== current.stage;
    const today = new Date().toISOString().slice(0, 10);
    const assignee = normalizeAssignee(patch.assignee);
    const nextValue = normalizeValue(patch.value);
    const source = normalizeSource(patch.source);
    const enrichmentStatus = normalizeEnrichmentStatus(patch.enrichmentStatus);

    const updated: PipelineDeal = {
      ...current,
      name: patch.name?.trim() || current.name,
      stage: nextStage,
      value: nextValue ?? current.value,
      client: patch.client?.trim() || current.client,
      contact: patch.contact === undefined ? current.contact : patch.contact.trim(),
      assignee: assignee ?? current.assignee,
      notes: patch.notes === undefined ? current.notes : patch.notes.trim(),
      source: source ?? current.source,
      email: patch.email === undefined ? current.email : patch.email.trim(),
      status: patch.status === undefined ? current.status : patch.status.trim(),
      enrichmentStatus: enrichmentStatus ?? current.enrichmentStatus,
      enrichmentData: patch.enrichmentData === undefined ? current.enrichmentData : patch.enrichmentData,
      rawWebhookData: patch.rawWebhookData === undefined ? current.rawWebhookData : patch.rawWebhookData,
      stageUpdatedAt: stageChanged ? today : current.stageUpdatedAt ?? current.createdAt,
    };

    deals[index] = updated;
    writePipelineDeals(deals);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update deal." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const deals = getPipelineDeals();
    const next = deals.filter((deal) => deal.id !== id);

    if (next.length === deals.length) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    writePipelineDeals(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete deal." }, { status: 500 });
  }
}
