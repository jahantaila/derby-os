import fs from "fs/promises";
import path from "path";
import { getCampaignName, getPrimaryName, STAGE_META } from "@/lib/pipeline-dashboard";
import { PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

const DATA_DIR = path.join(process.env.HOME || "/home/kim", "mission-control-data");
export const PIPELINE_ACTIVITY_FILE = "pipeline-activity.json";
const MAX_PIPELINE_ACTIVITY = 100;

export type PipelineActivityType = "new-lead" | "stage-change" | "enrichment";

export type PipelineActivityEntry = {
  id: string;
  type: PipelineActivityType;
  leadId: string;
  leadName: string;
  company: string;
  timestamp: string;
  message: string;
  city?: string;
  state?: string;
  source?: string;
  campaign?: string;
  fromStage?: PipelineStage;
  toStage?: PipelineStage;
};

function buildId() {
  return `pa_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeStage(value: unknown) {
  return typeof value === "string" && value in STAGE_META ? (value as PipelineStage) : undefined;
}

function normalizeActivityEntry(value: unknown): PipelineActivityEntry | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = normalizeOptionalString(record.id);
  const type = normalizeOptionalString(record.type) as PipelineActivityType | undefined;
  const leadId = normalizeOptionalString(record.leadId);
  const leadName = normalizeOptionalString(record.leadName);
  const company = normalizeOptionalString(record.company);
  const timestamp = normalizeOptionalString(record.timestamp);
  const message = normalizeOptionalString(record.message);

  if (!id || !type || !leadId || !leadName || !company || !timestamp || !message) return null;

  return {
    id,
    type,
    leadId,
    leadName,
    company,
    timestamp,
    message,
    city: normalizeOptionalString(record.city),
    state: normalizeOptionalString(record.state),
    source: normalizeOptionalString(record.source),
    campaign: normalizeOptionalString(record.campaign),
    fromStage: normalizeStage(record.fromStage),
    toStage: normalizeStage(record.toStage),
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readPipelineActivityFile() {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, PIPELINE_ACTIVITY_FILE), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeActivityEntry(entry))
      .filter((entry): entry is PipelineActivityEntry => entry !== null)
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  } catch {
    return [];
  }
}

async function writePipelineActivityFile(entries: PipelineActivityEntry[]) {
  await ensureDataDir();
  await fs.writeFile(
    path.join(DATA_DIR, PIPELINE_ACTIVITY_FILE),
    JSON.stringify(entries.slice(0, MAX_PIPELINE_ACTIVITY), null, 2),
    "utf-8",
  );
}

function buildBaseEntry(
  deal: PipelineDeal,
  type: PipelineActivityType,
  message: string,
  extra: Partial<PipelineActivityEntry> = {},
): PipelineActivityEntry {
  return {
    id: buildId(),
    type,
    leadId: deal.id,
    leadName: getPrimaryName(deal),
    company: deal.client,
    timestamp: new Date().toISOString(),
    message,
    city: deal.city?.trim() || undefined,
    state: deal.state?.trim() || undefined,
    source: deal.source,
    campaign: getCampaignName(deal),
    ...extra,
  };
}

export async function getPipelineActivity(limit = 20) {
  const entries = await readPipelineActivityFile();
  return entries.slice(0, Math.max(0, limit));
}

export async function appendPipelineActivity(entries: PipelineActivityEntry | PipelineActivityEntry[]) {
  const current = await readPipelineActivityFile();
  const next = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
  await writePipelineActivityFile(
    [...next, ...current].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)),
  );
}

export function createLeadCreatedActivity(deal: PipelineDeal) {
  const location = [deal.city?.trim(), deal.state?.trim()].filter(Boolean).join(", ");
  const sourceLabel = getCampaignName(deal);
  const suffix = sourceLabel ? ` - ${sourceLabel}` : "";
  const locationText = location ? ` from ${location}` : "";
  return buildBaseEntry(deal, "new-lead", `New lead: ${getPrimaryName(deal)}${locationText}${suffix}`);
}

export function createStageChangedActivity(previous: PipelineDeal, next: PipelineDeal) {
  return buildBaseEntry(
    next,
    "stage-change",
    `Stage changed: ${getPrimaryName(next)} moved to ${STAGE_META[next.stage].label}`,
    {
      fromStage: previous.stage,
      toStage: next.stage,
    },
  );
}

export function createEnrichmentActivity(previous: PipelineDeal, next: PipelineDeal) {
  const location = [next.city?.trim(), next.state?.trim()].filter(Boolean).join(", ");
  const detail = location ? ` - ${location}` : "";
  return buildBaseEntry(next, "enrichment", `Lead enriched: ${getPrimaryName(next)}${detail}`);
}
