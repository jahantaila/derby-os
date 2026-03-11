import { NextResponse } from "next/server";
import { enrichDeal, isEnrichableDeal } from "@/lib/enrich-utils";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { ConversationHistoryItem, PipelineDeal } from "@/lib/pipeline-types";

type AnyRecord = Record<string, unknown>;
type InstantlyEmail = {
  from_address_email?: unknown;
  to_address_email_list?: unknown;
  timestamp_email?: unknown;
  content_preview?: unknown;
  ue_type?: unknown;
};

const EASTERN_TIMEZONE = "America/New_York";

function buildDealId() {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null;
}

function readPath(record: AnyRecord, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function titleCaseFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractLead(payload: AnyRecord) {
  const email =
    asString(payload.email) ||
    asString(payload.lead_email) ||
    asString(readPath(payload, ["lead", "email"])) ||
    asString(readPath(payload, ["contact", "email"])) ||
    asString(readPath(payload, ["prospect", "email"]));

  const firstName =
    asString(payload.firstName) ||
    asString(readPath(payload, ["lead", "firstName"])) ||
    asString(readPath(payload, ["lead", "first_name"]));
  const lastName =
    asString(payload.lastName) ||
    asString(readPath(payload, ["lead", "lastName"])) ||
    asString(readPath(payload, ["lead", "last_name"]));

  const explicitName =
    asString(payload.name) ||
    asString(payload.fullName) ||
    asString(readPath(payload, ["lead", "name"])) ||
    asString(readPath(payload, ["lead", "fullName"])) ||
    [firstName, lastName].filter(Boolean).join(" ").trim();

  const name = explicitName || (email ? titleCaseFromEmail(email) : "");
  const company =
    asString(payload.company) ||
    asString(payload.companyName) ||
    asString(readPath(payload, ["lead", "company"])) ||
    asString(readPath(payload, ["lead", "companyName"])) ||
    asString(readPath(payload, ["lead", "company_name"]));

  const website =
    asString(payload.website) ||
    asString(readPath(payload, ["lead", "website"])) ||
    asString(readPath(payload, ["contact", "website"])) ||
    asString(readPath(payload, ["prospect", "website"]));

  return { email, name, company, website };
}

function detectCompetitor(payload: AnyRecord): string {
  const campaign = (
    asString(payload.campaign_name) ||
    asString(readPath(payload, ["campaign", "name"])) ||
    asString(payload.campaign) ||
    ""
  ).toUpperCase();
  if (campaign.includes("SPOTHOPPER")) return "SpotHopper";
  if (campaign.includes("OWNER")) return "Owner.com";
  if (campaign.includes("FISHERMAN")) return "Fisherman";
  if (campaign.includes("BENTOBOX")) return "BentoBox";
  if (campaign.includes("POPMENU")) return "Popmenu";
  return "DONT KNOW";
}

function formatEasternDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIMEZONE,
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const month = lookup("month");
  const day = lookup("day");
  const year = lookup("year");
  const hour = lookup("hour");
  const minute = lookup("minute");
  const dayPeriod = lookup("dayPeriod").toUpperCase();

  if (!month || !day || !year || !hour || !minute || !dayPeriod) return "";
  return `${month}/${day}/${year} ${hour}:${minute} ${dayPeriod} EST`;
}

function getMessagePreview(email: InstantlyEmail, fallbackSnippet: string): string {
  const preview = asString(email.content_preview);
  if (preview) return preview;
  return fallbackSnippet;
}

function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

function getDirection(email: InstantlyEmail): ConversationHistoryItem["direction"] {
  return Number(email.ue_type) === 2 ? "inbound" : "outbound";
}

function compareIsoDates(a: string, b: string): number {
  const aTime = new Date(a).getTime();
  const bTime = new Date(b).getTime();
  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return aTime - bTime;
}

async function fetchConversationHistory(payload: AnyRecord, leadEmail: string) {
  const campaignId =
    asString(payload.campaign_id) ||
    asString(readPath(payload, ["campaign", "id"])) ||
    asString(readPath(payload, ["campaign_id"]));
  const instantlyApiKey = process.env.INSTANTLY_API_KEY;
  const fallbackSnippet = asString(payload.reply_text_snippet) || asString(payload.reply_text);

  if (!campaignId || !instantlyApiKey) {
    return {
      conversationHistory: undefined,
      messagedFrom: undefined,
    };
  }

  const response = await fetch(`https://api.instantly.ai/api/v2/emails?campaign_id=${encodeURIComponent(campaignId)}&limit=50`, {
    headers: {
      Authorization: `Bearer ${instantlyApiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Instantly emails fetch failed: ${response.status}`);
  }

  const payloadData = (await response.json()) as unknown;
  const emails = Array.isArray(payloadData)
    ? payloadData
    : isRecord(payloadData) && Array.isArray(payloadData.items)
      ? payloadData.items
      : isRecord(payloadData) && Array.isArray(payloadData.data)
        ? payloadData.data
        : [];
  const normalizedLeadEmail = normalizeEmailAddress(leadEmail);

  const matchingEmails = emails
    .filter((entry): entry is InstantlyEmail => isRecord(entry))
    .filter((email) => {
      const from = normalizeEmailAddress(asString(email.from_address_email));
      const recipients = asStringArray(email.to_address_email_list).map(normalizeEmailAddress);
      return from === normalizedLeadEmail || recipients.includes(normalizedLeadEmail);
    })
    .sort((left, right) => compareIsoDates(asString(left.timestamp_email), asString(right.timestamp_email)));

  const conversationHistory = matchingEmails
    .map((email) => {
      const isoTimestamp = asString(email.timestamp_email);
      const date = formatEasternDate(isoTimestamp);
      const from = asString(email.from_address_email);
      const message = getMessagePreview(email, fallbackSnippet);
      const direction = getDirection(email);

      if (!date || !from || !message) return null;
      return { date, from, message, direction };
    })
    .filter((email): email is ConversationHistoryItem => email !== null);

  const firstOutbound = matchingEmails.find((email) => getDirection(email) === "outbound");

  return {
    conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
    messagedFrom: firstOutbound ? asString(firstOutbound.from_address_email) || undefined : undefined,
  };
}

function createWebhookDeal(
  lead: { email: string; name: string; company: string; website: string },
  payload: AnyRecord,
  history: { conversationHistory?: ConversationHistoryItem[]; messagedFrom?: string },
): PipelineDeal {
  const today = new Date().toISOString().slice(0, 10);
  const displayName = lead.name || lead.company || lead.email || "Instantly Lead";
  const clientName = lead.company || lead.name || lead.email || "Unknown Company";
  const competitor = detectCompetitor(payload);

  return {
    id: buildDealId(),
    name: displayName,
    stage: "new-lead",
    value: 0,
    client: clientName,
    contact: lead.name,
    assignee: "jahan",
    createdAt: today,
    competitor,
    tags: [competitor],
    notes: `Auto-imported from Instantly. Competitor: ${competitor}`,
    status: "new",
    source: "instantly",
    email: lead.email,
    enrichmentStatus: "pending",
    enrichmentData: null,
    phoneLog: [],
    conversationHistory: history.conversationHistory,
    messagedFrom: history.messagedFrom,
    website: lead.website || undefined,
    rawWebhookData: payload,
    stageUpdatedAt: today,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    const record = isRecord(payload) ? payload : {};
    const lead = extractLead(record);

    if (!lead.email) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no email" });
    }

    const deals = await getPipelineDeals();
    
    // Skip if already exists
    const exists = deals.some((d) => d.email === lead.email);
    if (exists) {
      return NextResponse.json({ ok: true, skipped: true, reason: "duplicate" });
    }

    let history: { conversationHistory?: ConversationHistoryItem[]; messagedFrom?: string } = {};
    try {
      history = await fetchConversationHistory(record, lead.email);
    } catch (error) {
      console.error("Failed to fetch Instantly conversation history", error);
    }

    const deal = createWebhookDeal(lead, record, history);
    deals.push(deal);
    await writePipelineDeals(deals);

    if (isEnrichableDeal(deal)) {
      try {
        await enrichDeal(deal.id);
      } catch (error) {
        console.error(`Instantly webhook auto-enrichment failed for deal ${deal.id}`, error);
      }
    }

    return NextResponse.json({ ok: true, dealId: deal.id, competitor: deal.competitor });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
