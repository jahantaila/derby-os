import { PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

export const EASTERN_TIME_ZONE = "America/New_York";

export const DASHBOARD_FUNNEL_STAGES: PipelineStage[] = [
  "new-lead",
  "contacted",
  "interested",
  "scheduled-meeting",
  "attended-meeting",
  "negotiating",
  "closed-won",
];

export const HOT_LEAD_STAGES: PipelineStage[] = ["interested", "scheduled-meeting", "negotiating"];

export const STAGE_META: Record<PipelineStage, { label: string; color: string; pill: string }> = {
  "new-lead": {
    label: "New Lead",
    color: "#3B82F6",
    pill: "border-blue-400/30 bg-blue-500/15 text-blue-100",
  },
  contacted: {
    label: "Contacted",
    color: "#06B6D4",
    pill: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
  },
  interested: {
    label: "Interested",
    color: "#10B981",
    pill: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  },
  "scheduled-meeting": {
    label: "Scheduled Meeting",
    color: "#F59E0B",
    pill: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  },
  "attended-meeting": {
    label: "Attended Meeting",
    color: "#F97316",
    pill: "border-orange-400/30 bg-orange-500/15 text-orange-100",
  },
  negotiating: {
    label: "Negotiating",
    color: "#2563EB",
    pill: "border-blue-400/30 bg-blue-500/15 text-blue-100",
  },
  "closed-won": {
    label: "Closed Won",
    color: "#22C55E",
    pill: "border-green-400/30 bg-green-500/15 text-green-100",
  },
  "closed-lost": {
    label: "Closed Lost",
    color: "#6B7280",
    pill: "border-slate-400/30 bg-slate-500/15 text-slate-100",
  },
};

export type MorningSummaryLead = {
  id: string;
  name: string;
  company: string;
  stage: PipelineStage;
  city: string | null;
  state: string | null;
  createdAt: string;
  stageUpdatedAt: string;
  ageDays: number;
  source: string;
};

export type FunnelDatum = {
  stage: PipelineStage;
  count: number;
  conversionRate: number;
};

export type CampaignStat = {
  campaign: string;
  total: number;
  interested: number;
  replyRate: number;
  lastImport: string | null;
  status: "active" | "cooling" | "idle";
  lastActivityAt: string | null;
};

export type MorningSummary = {
  newToday: number;
  newThisWeek: number;
  needsFollowUp: MorningSummaryLead[];
  staleLeads: number;
  hotLeads: MorningSummaryLead[];
  topCities: Array<{ city: string; count: number }>;
  campaignStats: CampaignStat[];
  funnelData: FunnelDatum[];
};

function toEasternParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
  };
}

export function easternDateOnly(value = new Date()) {
  const parts = toEasternParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function easternDateFromIso(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return easternDateOnly(parsed);
}

function easternDayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

export function diffEasternDays(from: string, to = easternDateOnly()) {
  if (!from) return 0;
  return Math.max(0, easternDayIndex(to) - easternDayIndex(from));
}

export function formatLocation(city?: string | null, state?: string | null) {
  return [city?.trim(), state?.trim()].filter(Boolean).join(", ");
}

export function getPrimaryName(deal: PipelineDeal) {
  return deal.contact?.trim() || deal.name.trim();
}

export function formatSourceLabel(source: string) {
  return source.trim().toUpperCase() || "UNKNOWN";
}

function readCampaignFromRecord(record: unknown) {
  if (!record || typeof record !== "object") return "";
  const value = record as Record<string, unknown>;
  const rawCampaign = value.campaign;
  if (typeof value.campaign_name === "string" && value.campaign_name.trim()) return value.campaign_name.trim();
  if (typeof rawCampaign === "string" && rawCampaign.trim()) return rawCampaign.trim();
  if (rawCampaign && typeof rawCampaign === "object") {
    const nested = rawCampaign as Record<string, unknown>;
    if (typeof nested.name === "string" && nested.name.trim()) return nested.name.trim();
  }
  return "";
}

export function getCampaignName(deal: PipelineDeal) {
  const fromWebhook = readCampaignFromRecord(deal.rawWebhookData);
  if (fromWebhook) return fromWebhook;

  const notesMatch = deal.notes.match(/campaign:\s*([^\n\r]+)/i);
  if (notesMatch?.[1]?.trim()) return notesMatch[1].trim();

  const firstMeaningfulTag = deal.tags.find((tag) => tag.trim() && tag.trim() !== deal.competitor?.trim());
  if (firstMeaningfulTag) return firstMeaningfulTag.trim();

  if (deal.competitor?.trim()) return deal.competitor.trim();
  return formatSourceLabel(deal.source);
}

function buildSummaryLead(deal: PipelineDeal): MorningSummaryLead {
  const stageDate = easternDateFromIso(deal.stageUpdatedAt || deal.createdAt) || deal.createdAt;
  return {
    id: deal.id,
    name: getPrimaryName(deal),
    company: deal.client,
    stage: deal.stage,
    city: deal.city?.trim() || null,
    state: deal.state?.trim() || null,
    createdAt: deal.createdAt,
    stageUpdatedAt: stageDate,
    ageDays: diffEasternDays(stageDate),
    source: deal.source,
  };
}

function createdWithinLastDays(value: string, days: number, today = easternDateOnly()) {
  const dateOnly = easternDateFromIso(value);
  if (!dateOnly) return false;
  return diffEasternDays(dateOnly, today) < days;
}

function hasInboundReply(deal: PipelineDeal) {
  return (deal.conversationHistory ?? []).some((entry) => entry.direction === "inbound");
}

function buildCampaignStats(deals: PipelineDeal[]): CampaignStat[] {
  const groups = new Map<string, PipelineDeal[]>();

  deals.forEach((deal) => {
    const key = getCampaignName(deal) || "Unknown";
    const current = groups.get(key) ?? [];
    current.push(deal);
    groups.set(key, current);
  });

  return [...groups.entries()]
    .map(([campaign, entries]) => {
      const total = entries.length;
      const interested = entries.filter((deal) => HOT_LEAD_STAGES.includes(deal.stage)).length;
      const replyCount = entries.filter(hasInboundReply).length;
      const lastImport = entries
        .map((deal) => easternDateFromIso(deal.createdAt))
        .filter(Boolean)
        .sort((left, right) => right.localeCompare(left))[0] ?? null;
      const lastActivityAt = entries
        .map((deal) => easternDateFromIso(deal.stageUpdatedAt || deal.createdAt))
        .filter(Boolean)
        .sort((left, right) => right.localeCompare(left))[0] ?? null;
      const activityAge = lastActivityAt ? diffEasternDays(lastActivityAt) : 999;
      const status: CampaignStat["status"] = activityAge <= 2 ? "active" : activityAge <= 7 ? "cooling" : "idle";

      return {
        campaign,
        total,
        interested,
        replyRate: total ? Math.round((replyCount / total) * 100) : 0,
        lastImport,
        status,
        lastActivityAt,
      };
    })
    .sort((left, right) => {
      const leftDate = left.lastActivityAt ?? "";
      const rightDate = right.lastActivityAt ?? "";
      return rightDate.localeCompare(leftDate) || right.total - left.total || left.campaign.localeCompare(right.campaign);
    });
}

function buildTopCities(deals: PipelineDeal[]) {
  const counts = new Map<string, number>();
  deals.forEach((deal) => {
    const city = deal.city?.trim();
    if (!city) return;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((left, right) => right.count - left.count || left.city.localeCompare(right.city))
    .slice(0, 10);
}

function buildFunnelData(deals: PipelineDeal[]): FunnelDatum[] {
  return DASHBOARD_FUNNEL_STAGES.map((stage, index) => {
    const count = deals.filter((deal) => deal.stage === stage).length;
    const nextStage = DASHBOARD_FUNNEL_STAGES[index + 1];
    const nextCount = nextStage ? deals.filter((deal) => deal.stage === nextStage).length : 0;
    const conversionRate = nextStage && count > 0 ? Math.round((nextCount / count) * 100) : 0;
    return { stage, count, conversionRate };
  });
}

export function buildMorningSummary(deals: PipelineDeal[]): MorningSummary {
  const today = easternDateOnly();
  const needsFollowUp = deals
    .filter((deal) => deal.stage === "contacted")
    .filter((deal) => diffEasternDays(easternDateFromIso(deal.stageUpdatedAt || deal.createdAt), today) >= 3)
    .map(buildSummaryLead)
    .sort((left, right) => right.ageDays - left.ageDays || left.name.localeCompare(right.name));

  const hotLeads = deals
    .filter((deal) => HOT_LEAD_STAGES.includes(deal.stage))
    .map(buildSummaryLead)
    .sort((left, right) => {
      const leftWeight = HOT_LEAD_STAGES.indexOf(left.stage);
      const rightWeight = HOT_LEAD_STAGES.indexOf(right.stage);
      return rightWeight - leftWeight || right.stageUpdatedAt.localeCompare(left.stageUpdatedAt);
    });

  return {
    newToday: deals.filter((deal) => easternDateFromIso(deal.createdAt) === today).length,
    newThisWeek: deals.filter((deal) => createdWithinLastDays(deal.createdAt, 7, today)).length,
    needsFollowUp,
    staleLeads: deals.filter((deal) => deal.stage === "new-lead" && diffEasternDays(deal.createdAt, today) >= 7).length,
    hotLeads,
    topCities: buildTopCities(deals),
    campaignStats: buildCampaignStats(deals),
    funnelData: buildFunnelData(deals),
  };
}
