import { NextResponse } from "next/server";
import { appendPipelineActivity, createStageChangedActivity } from "@/lib/pipeline-activity";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import {
  EnrichmentStatus,
  PIPELINE_ASSIGNEES,
  PIPELINE_STAGES,
  PipelineDeal,
  PipelineStage,
} from "@/lib/pipeline-types";

type UpdateDealInput = Partial<Omit<PipelineDeal, "id" | "createdAt">>;

const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);
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

function normalizeSource(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeEnrichmentStatus(value: unknown): EnrichmentStatus | undefined {
  if (typeof value !== "string") return undefined;
  return VALID_ENRICHMENT_STATUS.has(value as EnrichmentStatus) ? (value as EnrichmentStatus) : undefined;
}

function normalizeTag(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(value: unknown, competitor?: string): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const normalized: string[] = [];
  const seen = new Set<string>();

  value.forEach((entry) => {
    const tag = normalizeTag(entry);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return;
    seen.add(key);
    normalized.push(tag);
  });

  const competitorTag = normalizeTag(competitor);
  const competitorKey = competitorTag.toLowerCase();
  if (competitorTag && !seen.has(competitorKey)) {
    normalized.push(competitorTag);
  }

  return normalized;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const deal = (await getPipelineDeals()).find((item) => item.id === params.id);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
  return NextResponse.json(deal);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const patch = (await request.json()) as UpdateDealInput;
    const deals = await getPipelineDeals();
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
    const competitor = patch.competitor === undefined ? current.competitor : patch.competitor?.trim() || undefined;
    const tags = normalizeTags(patch.tags, competitor);

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
      phoneLog: patch.phoneLog === undefined ? current.phoneLog : patch.phoneLog,
      tags: tags ?? current.tags,
      competitor,
      conversationHistory: patch.conversationHistory === undefined ? current.conversationHistory : patch.conversationHistory,
      messagedFrom: patch.messagedFrom === undefined ? current.messagedFrom : patch.messagedFrom?.trim() || undefined,
      website: patch.website === undefined ? current.website : patch.website?.trim() || undefined,
      city: patch.city === undefined ? current.city : normalizeOptionalString(patch.city),
      state: patch.state === undefined ? current.state : normalizeOptionalString(patch.state),
      rawWebhookData: patch.rawWebhookData === undefined ? current.rawWebhookData : patch.rawWebhookData,
      stageUpdatedAt: stageChanged ? today : current.stageUpdatedAt ?? current.createdAt,
    };

    deals[index] = updated;
    await writePipelineDeals(deals);
    if (stageChanged) {
      await appendPipelineActivity(createStageChangedActivity(current, updated));
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update deal." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const deals = await getPipelineDeals();
    const next = deals.filter((deal) => deal.id !== id);

    if (next.length === deals.length) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    await writePipelineDeals(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete deal." }, { status: 500 });
  }
}
