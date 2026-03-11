import { readPersistentData, writePersistentData } from "@/lib/persistence";
import {
  ConversationHistoryItem,
  EnrichmentData,
  EnrichmentStatus,
  INITIAL_PIPELINE_DEALS,
  PhoneLogEntry,
  PIPELINE_ASSIGNEES,
  PIPELINE_STAGES,
  PipelineDeal,
  PipelineStage,
} from "@/lib/pipeline-types";

const PIPELINE_FILE = "pipeline.json";
const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const LEGACY_STAGES = new Set(["lead", "outreach", "proposal", "negotiation", "won"]);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);
const VALID_ENRICHMENT_STATUS = new Set<EnrichmentStatus>(["pending", "enriched", "failed"]);

export type PipelineDealUpsertInput = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDealId() {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return todayIsoDate();
}

function normalizeStage(value: unknown): PipelineStage {
  if (typeof value === "string" && VALID_STAGES.has(value as PipelineStage)) {
    return value as PipelineStage;
  }
  return "new-lead";
}

function normalizeAssignee(value: unknown): string {
  if (typeof value === "string" && VALID_ASSIGNEES.has(value.trim().toLowerCase())) {
    return value.trim().toLowerCase();
  }
  return "jahan";
}

function normalizeSource(value: unknown): string {
  if (typeof value !== "string") return "manual";
  const normalized = value.trim().toLowerCase();
  return normalized || "manual";
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

function normalizeEmail(value: unknown): string {
  return normalizeString(value).toLowerCase();
}

function normalizeTags(value: unknown, competitor?: string): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      const tag = normalizeString(entry);
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return;
      seen.add(key);
      normalized.push(tag);
    });
  }

  const competitorTag = normalizeString(competitor);
  const competitorKey = competitorTag.toLowerCase();
  if (competitorTag && !seen.has(competitorKey)) {
    seen.add(competitorKey);
    normalized.push(competitorTag);
  }

  return normalized;
}

function mergeTags(currentTags: string[], incomingTags: string[], competitor?: string): string[] {
  return normalizeTags([...currentTags, ...incomingTags], competitor);
}

function mergeNotes(currentNotes: string, incomingNotes: string): string {
  if (!incomingNotes) return currentNotes;
  if (!currentNotes) return incomingNotes;
  if (currentNotes.includes(incomingNotes)) return currentNotes;
  if (incomingNotes.includes(currentNotes)) return incomingNotes;
  return `${currentNotes}\n\n${incomingNotes}`;
}

function mergeEnrichmentData(
  current: EnrichmentData | null,
  incoming: EnrichmentData | null,
  website?: string,
): EnrichmentData | null {
  if (!current && !incoming && !website) return null;

  return {
    ...(current ?? {}),
    ...(current?.phone ? {} : incoming?.phone ? { phone: incoming.phone } : {}),
    ...(current?.ownerName ? {} : incoming?.ownerName ? { ownerName: incoming.ownerName } : {}),
    ...(current?.address ? {} : incoming?.address ? { address: incoming.address } : {}),
    ...(current?.website ? {} : website ? { website } : incoming?.website ? { website: incoming.website } : {}),
    ...(current?.googleRating !== undefined
      ? {}
      : incoming?.googleRating !== undefined
        ? { googleRating: incoming.googleRating }
        : {}),
    ...(current?.reviewCount !== undefined
      ? {}
      : incoming?.reviewCount !== undefined
        ? { reviewCount: incoming.reviewCount }
        : {}),
    ...(current?.cuisine ? {} : incoming?.cuisine ? { cuisine: incoming.cuisine } : {}),
    ...(current?.socialMedia ? {} : incoming?.socialMedia ? { socialMedia: incoming.socialMedia } : {}),
    ...(current?.notes ? {} : incoming?.notes ? { notes: incoming.notes } : {}),
    ...(current?.enrichedAt ? {} : incoming?.enrichedAt ? { enrichedAt: incoming.enrichedAt } : {}),
  };
}

function createDealFromInput(input: PipelineDealUpsertInput): PipelineDeal | null {
  const name = normalizeString(input.name);
  const client = normalizeString(input.client);

  if (!name || !client) return null;

  const today = todayIsoDate();
  const competitor = normalizeString(input.competitor) || undefined;
  const phone = normalizeString(input.phone);
  const website = normalizeString(input.website);

  return {
    id: buildDealId(),
    name,
    stage: normalizeStage(input.stage),
    value: normalizeNumber(input.value),
    client,
    contact: normalizeString(input.contact),
    assignee: normalizeAssignee(input.assignee),
    createdAt: today,
    notes: normalizeString(input.notes),
    status: "new",
    source: normalizeSource(input.source),
    email: normalizeString(input.email),
    enrichmentStatus: "pending",
    enrichmentData:
      phone || website
        ? {
            ...(phone ? { phone } : {}),
            ...(website ? { website } : {}),
          }
        : null,
    phoneLog: [],
    tags: normalizeTags(input.tags, competitor),
    competitor,
    website: website || undefined,
    stageUpdatedAt: today,
  };
}

function mergeDeal(current: PipelineDeal, input: PipelineDealUpsertInput): PipelineDeal {
  const incomingStage = normalizeStage(input.stage);
  const currentEmail = normalizeString(current.email);
  const incomingEmail = normalizeString(input.email);
  const currentWebsite = normalizeString(current.website);
  const incomingWebsite = normalizeString(input.website);
  const currentCompetitor = normalizeString(current.competitor);
  const incomingCompetitor = normalizeString(input.competitor);
  const mergedCompetitor = currentCompetitor || incomingCompetitor || undefined;
  const incomingPhone = normalizeString(input.phone);
  const incomingTags = normalizeTags(input.tags, incomingCompetitor || undefined);
  const mergedStage = current.stage === "new-lead" && incomingStage !== "new-lead" ? incomingStage : current.stage;
  const stageChanged = mergedStage !== current.stage;

  return {
    ...current,
    name: current.name || normalizeString(input.name),
    stage: mergedStage,
    value: Math.max(current.value, normalizeNumber(input.value)),
    client: current.client || normalizeString(input.client),
    contact: current.contact || normalizeString(input.contact),
    assignee: current.assignee || normalizeAssignee(input.assignee),
    notes: mergeNotes(current.notes, normalizeString(input.notes)),
    status: current.status || "new",
    source: current.source === "manual" ? normalizeSource(input.source) : current.source,
    email: currentEmail || incomingEmail,
    enrichmentStatus: current.enrichmentStatus,
    enrichmentData: mergeEnrichmentData(
      current.enrichmentData,
      incomingPhone || incomingWebsite
        ? {
            ...(incomingPhone ? { phone: incomingPhone } : {}),
            ...(incomingWebsite ? { website: incomingWebsite } : {}),
          }
        : null,
      currentWebsite || incomingWebsite || undefined,
    ),
    phoneLog: current.phoneLog,
    tags: mergeTags(current.tags, incomingTags, mergedCompetitor),
    competitor: mergedCompetitor,
    conversationHistory: current.conversationHistory,
    messagedFrom: current.messagedFrom,
    website: currentWebsite || incomingWebsite || undefined,
    rawWebhookData: current.rawWebhookData,
    stageUpdatedAt: stageChanged ? todayIsoDate() : current.stageUpdatedAt ?? current.createdAt,
  };
}

function detectCompetitorFromCampaign(campaignName: string): string {
  const campaign = campaignName.toUpperCase();
  if (campaign.includes("SPOTHOPPER")) return "SpotHopper";
  if (campaign.includes("OWNER")) return "Owner.com";
  if (campaign.includes("FISHERMAN")) return "Fisherman";
  if (campaign.includes("BENTOBOX")) return "BentoBox";
  if (campaign.includes("POPMENU")) return "Popmenu";
  return "DONT KNOW";
}

function normalizeCompetitor(value: unknown, rawWebhookData: unknown, notes: string): string | undefined {
  const explicit = normalizeString(value);
  if (explicit) return explicit;

  if (isRecord(rawWebhookData)) {
    const campaignName =
      normalizeString(rawWebhookData.campaign_name) ||
      (isRecord(rawWebhookData.campaign) ? normalizeString(rawWebhookData.campaign.name) : "") ||
      normalizeString(rawWebhookData.campaign);
    if (campaignName) return detectCompetitorFromCampaign(campaignName);
  }

  const noteMatch = notes.match(/Competitor:\s*([^\n\r]+)/i);
  if (noteMatch) {
    const inferred = normalizeString(noteMatch[1]);
    if (inferred) return inferred;
  }

  return undefined;
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

function normalizeConversationDirection(value: unknown): ConversationHistoryItem["direction"] | undefined {
  return value === "outbound" || value === "inbound" ? value : undefined;
}

function normalizeConversationHistory(value: unknown): ConversationHistoryItem[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const items = value
    .map((entry) => {
      if (!isRecord(entry)) return null;

      const date = normalizeString(entry.date);
      const from = normalizeString(entry.from);
      const message = normalizeString(entry.message);
      const direction = normalizeConversationDirection(entry.direction);

      if (!date || !from || !message || !direction) return null;

      return { date, from, message, direction };
    })
    .filter((entry): entry is ConversationHistoryItem => entry !== null);

  return items.length > 0 ? items : undefined;
}

function normalizePhoneLog(value: unknown): PhoneLogEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;

      const id = normalizeString(entry.id);
      const date = normalizeString(entry.date);
      const notes = normalizeString(entry.notes);
      const createdAt = normalizeString(entry.createdAt);

      if (!id || !date || !notes) return null;

      return {
        id,
        date,
        notes,
        createdAt: createdAt || new Date().toISOString(),
      };
    })
    .filter((entry): entry is PhoneLogEntry => entry !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function normalizeDeal(raw: unknown): PipelineDeal | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const client = normalizeString(raw.client);
  if (!id || !name || !client) return null;

  const createdAt = normalizeDate(raw.createdAt);
  const stage = normalizeStage(raw.stage);
  const competitor = normalizeCompetitor(raw.competitor, raw.rawWebhookData, normalizeString(raw.notes));

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
    phoneLog: normalizePhoneLog(raw.phoneLog),
    tags: normalizeTags(raw.tags, competitor),
    competitor,
    conversationHistory: normalizeConversationHistory(raw.conversationHistory),
    messagedFrom: normalizeString(raw.messagedFrom) || undefined,
    website: normalizeString(raw.website) || undefined,
    rawWebhookData: raw.rawWebhookData,
    stageUpdatedAt: normalizeDate(raw.stageUpdatedAt ?? createdAt),
  };
}

function normalizePipeline(raw: unknown): PipelineDeal[] {
  if (!Array.isArray(raw)) return INITIAL_PIPELINE_DEALS;
  const hasLegacyStages = raw.some(
    (entry) => isRecord(entry) && typeof entry.stage === "string" && LEGACY_STAGES.has(entry.stage),
  );
  if (hasLegacyStages) return INITIAL_PIPELINE_DEALS;
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

export async function upsertPipelineDealByEmail(
  input: PipelineDealUpsertInput,
): Promise<{ action: "created" | "updated"; deal: PipelineDeal } | null> {
  const deals = await getPipelineDeals();
  const normalizedEmail = normalizeEmail(input.email);

  if (normalizedEmail) {
    const existingIndex = deals.findIndex((deal) => normalizeEmail(deal.email) === normalizedEmail);
    if (existingIndex >= 0) {
      const updatedDeal = mergeDeal(deals[existingIndex], input);
      deals[existingIndex] = updatedDeal;
      await writePipelineDeals(deals);
      return { action: "updated", deal: updatedDeal };
    }
  }

  const createdDeal = createDealFromInput(input);
  if (!createdDeal) return null;

  deals.push(createdDeal);
  await writePipelineDeals(deals);
  return { action: "created", deal: createdDeal };
}

export async function bulkImportPipelineDeals(
  inputs: PipelineDealUpsertInput[],
): Promise<{ imported: number; updated: number; skipped: number }> {
  const deals = await getPipelineDeals();
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const input of inputs) {
    const normalizedEmail = normalizeEmail(input.email);

    if (!normalizeString(input.name) || !normalizeString(input.client)) {
      skipped += 1;
      continue;
    }

    if (normalizedEmail) {
      const existingIndex = deals.findIndex((deal) => normalizeEmail(deal.email) === normalizedEmail);
      if (existingIndex >= 0) {
        deals[existingIndex] = mergeDeal(deals[existingIndex], input);
        updated += 1;
        continue;
      }
    }

    const createdDeal = createDealFromInput(input);
    if (!createdDeal) {
      skipped += 1;
      continue;
    }

    deals.push(createdDeal);
    imported += 1;
  }

  await writePipelineDeals(deals);
  return { imported, updated, skipped };
}
