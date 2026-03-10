import { NextResponse } from "next/server";
import { appendInstantlyWebhookLog } from "@/lib/webhook-log";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PipelineDeal } from "@/lib/pipeline-types";

type AnyRecord = Record<string, unknown>;

function buildDealId() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function buildLogId() {
  return `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

  return { email, name, company };
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

function createWebhookDeal(lead: { email: string; name: string; company: string }, payload: AnyRecord): PipelineDeal {
  const today = new Date().toISOString().slice(0, 10);
  const displayName = lead.name || lead.company || lead.email || "Instantly Lead";
  const clientName = lead.company || lead.name || lead.email || "Unknown Company";

  return {
    id: buildDealId(),
    name: displayName,
    stage: "new-lead",
    value: 0,
    client: clientName,
    contact: lead.name,
    assignee: "jahan",
    createdAt: today,
    competitor: detectCompetitor(payload),
    notes: `Auto-imported from Instantly. Competitor: ${detectCompetitor(payload)}`,
    status: "new",
    source: "instantly",
    email: lead.email,
    enrichmentStatus: "pending",
    enrichmentData: null,
    rawWebhookData: payload,
    stageUpdatedAt: today,
  };
}

export async function POST(request: Request) {
  // No auth check — Instantly webhooks don't support custom headers

  const timestamp = new Date().toISOString();

  try {
    const payload = (await request.json()) as unknown;
    const record = isRecord(payload) ? payload : {};
    const lead = extractLead(record);

    if (!lead.email) {
      appendInstantlyWebhookLog({
        id: buildLogId(),
        timestamp,
        email: "",
        company: lead.company,
        status: "error",
        dealId: "",
      });
      return NextResponse.json({ ok: true, error: "Webhook missing lead email." });
    }

    const deals = await getPipelineDeals();
    const deal = createWebhookDeal(lead, record);
    deals.push(deal);
    await writePipelineDeals(deals);

    appendInstantlyWebhookLog({
      id: buildLogId(),
      timestamp,
      email: lead.email,
      company: lead.company,
      status: "processed",
      dealId: deal.id,
    });

    return NextResponse.json({ ok: true, dealId: deal.id });
  } catch {
    appendInstantlyWebhookLog({
      id: buildLogId(),
      timestamp,
      email: "",
      company: "",
      status: "error",
      dealId: "",
    });
    return NextResponse.json({ ok: true, error: "Unable to process webhook payload." });
  }
}
