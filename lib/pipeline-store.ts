import { readPersistentData, writePersistentData } from "@/lib/persistence";
import {
  EnrichmentData,
  EnrichmentStatus,
  INITIAL_PIPELINE_DEALS,
  PIPELINE_ASSIGNEES,
  PIPELINE_STAGES,
  PipelineDeal,
  PipelineSource,
  PipelineStage,
} from "@/lib/pipeline-types";

const PIPELINE_FILE = "pipeline.json";
const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);
const VALID_SOURCES = new Set<PipelineSource>(["instantly", "manual", "referral", "website"]);
const VALID_ENRICHMENT_STATUS = new Set<EnrichmentStatus>(["pending", "enriched", "failed"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return todayIsoDate();
}

function normalizeStage(value: unknown): PipelineStage {
  if (typeof value === "string" && VALID_STAGES.has(value as PipelineStage)) {
    return value as PipelineStage;
  }
  return "lead";
}

function normalizeAssignee(value: unknown): string {
  if (typeof value === "string" && VALID_ASSIGNEES.has(value.trim().toLowerCase())) {
    return value.trim().toLowerCase();
  }
  return "jahan";
}

function normalizeSource(value: unknown): PipelineSource {
  return typeof value === "string" && VALID_SOURCES.has(value as PipelineSource) ? (value as PipelineSource) : "manual";
}

function normalizeEnrichmentStatus(value: unknown): EnrichmentStatus {
  if (typeof value === "string" && VALID_ENRICHMENT_STATUS.has(value as EnrichmentStatus)) {
    return value as EnrichmentStatus;
  }
  return "pending";
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeEnrichmentData(value: unknown): EnrichmentData | null {
  if (!isRecord(value)) return null;

  const socialRaw = isRecord(value.socialMedia) ? value.socialMedia : null;
  const socialMedia =
    socialRaw && (normalizeString(socialRaw.facebook) || normalizeString(socialRaw.instagram))
      ? {
          ...(normalizeString(socialRaw.facebook) ? { facebook: normalizeString(socialRaw.facebook) } : {}),
          ...(normalizeString(socialRaw.instagram) ? { instagram: normalizeString(socialRaw.instagram) } : {}),
        }
      : undefined;

  return {
    ...(normalizeString(value.phone) ? { phone: normalizeString(value.phone) } : {}),
    ...(normalizeString(value.ownerName) ? { ownerName: normalizeString(value.ownerName) } : {}),
    ...(normalizeString(value.address) ? { address: normalizeString(value.address) } : {}),
    ...(normalizeString(value.website) ? { website: normalizeString(value.website) } : {}),
    ...(normalizeOptionalNumber(value.googleRating) !== undefined
      ? { googleRating: normalizeOptionalNumber(value.googleRating) }
      : {}),
    ...(normalizeOptionalNumber(value.reviewCount) !== undefined
      ? { reviewCount: normalizeOptionalNumber(value.reviewCount) }
      : {}),
    ...(normalizeString(value.cuisine) ? { cuisine: normalizeString(value.cuisine) } : {}),
    ...(socialMedia ? { socialMedia } : {}),
    ...(normalizeString(value.notes) ? { notes: normalizeString(value.notes) } : {}),
    ...(normalizeString(value.enrichedAt) ? { enrichedAt: normalizeString(value.enrichedAt) } : {}),
  };
}

function normalizeDeal(raw: unknown): PipelineDeal | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const client = normalizeString(raw.client);
  if (!id || !name || !client) return null;

  const createdAt = normalizeDate(raw.createdAt);
  const stage = normalizeStage(raw.stage);

  return {
    id,
    name,
    stage,
    value: normalizeNumber(raw.value),
    client,
    contact: normalizeString(raw.contact),
    assignee: normalizeAssignee(raw.assignee),
    createdAt,
    notes: normalizeString(raw.notes),
    status: normalizeString(raw.status) || "new",
    source: normalizeSource(raw.source),
    email: normalizeString(raw.email),
    enrichmentStatus: normalizeEnrichmentStatus(raw.enrichmentStatus),
    enrichmentData: normalizeEnrichmentData(raw.enrichmentData),
    rawWebhookData: raw.rawWebhookData,
    stageUpdatedAt: normalizeDate(raw.stageUpdatedAt ?? createdAt),
  };
}

function normalizePipeline(raw: unknown): PipelineDeal[] {
  if (!Array.isArray(raw)) return INITIAL_PIPELINE_DEALS;
  const deals = raw.map(normalizeDeal).filter((deal): deal is PipelineDeal => deal !== null);
  return deals.length > 0 ? deals : INITIAL_PIPELINE_DEALS;
}

export async function getPipelineDeals(): Promise<PipelineDeal[]> {
  const raw = await readPersistentData<unknown>(PIPELINE_FILE, INITIAL_PIPELINE_DEALS);
  const normalized = normalizePipeline(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await writePipelineDeals(normalized);
  }
  return normalized;
}

export async function writePipelineDeals(deals: PipelineDeal[]) {
  const normalized = normalizePipeline(deals);
  await writePersistentData(PIPELINE_FILE, normalized);
}
