import { readData, writeData } from "@/lib/data";
import { INITIAL_PIPELINE_DEALS, PIPELINE_ASSIGNEES, PIPELINE_STAGES, PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

const PIPELINE_FILE = "pipeline.json";
const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);

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

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

function normalizeDeal(raw: unknown): PipelineDeal | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const client = typeof raw.client === "string" ? raw.client.trim() : "";
  if (!id || !name || !client) return null;

  const createdAt = normalizeDate(raw.createdAt);
  const stage = normalizeStage(raw.stage);

  return {
    id,
    name,
    stage,
    value: normalizeNumber(raw.value),
    client,
    contact: typeof raw.contact === "string" ? raw.contact.trim() : "",
    assignee: normalizeAssignee(raw.assignee),
    createdAt,
    notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
    stageUpdatedAt: normalizeDate(raw.stageUpdatedAt ?? createdAt),
  };
}

function normalizePipeline(raw: unknown): PipelineDeal[] {
  if (!Array.isArray(raw)) return INITIAL_PIPELINE_DEALS;
  const deals = raw.map(normalizeDeal).filter((deal): deal is PipelineDeal => deal !== null);
  return deals.length > 0 ? deals : INITIAL_PIPELINE_DEALS;
}

export function getPipelineDeals(): PipelineDeal[] {
  const raw = readData<unknown>(PIPELINE_FILE, null);
  if (raw === null) {
    try {
      writeData(PIPELINE_FILE, INITIAL_PIPELINE_DEALS);
    } catch {
      // Sandbox-restricted environments may not allow writes outside workspace.
    }
    return INITIAL_PIPELINE_DEALS;
  }

  const normalized = normalizePipeline(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    writePipelineDeals(normalized);
  }
  return normalized;
}

export function writePipelineDeals(deals: PipelineDeal[]) {
  const normalized = normalizePipeline(deals);
  writeData(PIPELINE_FILE, normalized);
}
