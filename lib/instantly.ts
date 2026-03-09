import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PipelineDeal } from "@/lib/pipeline-types";

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v2";

type InstantlyCampaign = {
  id?: string;
  name?: string;
};

type InstantlyLead = {
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  timestamp_created?: string;
};

type NormalizedInstantlyLead = {
  email: string;
  company: string;
  campaign: string;
  firstName: string;
  lastName: string;
  timestampCreated: string;
};

type ImportMode = "import" | "dry-run";

export type InstantlyImportResult = {
  imported: number;
  skipped: number;
  total: number;
};

export type InstantlySyncResult = {
  newLeads: Array<{ email: string; company: string; campaign: string }>;
  count: number;
};

function buildDealId() {
  return `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function emailPrefix(email: string): string {
  return email.split("@")[0]?.trim() ?? "";
}

function fallbackName(email: string): string {
  const prefix = emailPrefix(email);
  return prefix || email;
}

function formatContact(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function normalizeCreatedAt(timestamp: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(timestamp)) {
    return timestamp.slice(0, 10);
  }

  const parsed = new Date(timestamp);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

async function fetchInstantly<T>(path: string, init: RequestInit, apiKey: string): Promise<T> {
  const response = await fetch(`${INSTANTLY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Instantly API request failed (${response.status}): ${detail || path}`);
  }

  return (await response.json()) as T;
}

function normalizeCampaigns(payload: unknown): InstantlyCampaign[] {
  if (Array.isArray(payload)) return payload as InstantlyCampaign[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as InstantlyCampaign[];
    if (Array.isArray(record.data)) return record.data as InstantlyCampaign[];
    if (Array.isArray(record.campaigns)) return record.campaigns as InstantlyCampaign[];
  }
  return [];
}

function normalizeLeads(payload: unknown): InstantlyLead[] {
  if (Array.isArray(payload)) return payload as InstantlyLead[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items as InstantlyLead[];
    if (Array.isArray(record.data)) return record.data as InstantlyLead[];
    if (Array.isArray(record.leads)) return record.leads as InstantlyLead[];
  }
  return [];
}

async function fetchInterestedLeads(apiKey: string): Promise<NormalizedInstantlyLead[]> {
  const campaignPayload = await fetchInstantly<unknown>("/campaigns", { method: "GET" }, apiKey);
  const campaigns = normalizeCampaigns(campaignPayload);

  const responses = await Promise.all(
    campaigns
      .map((campaign) => {
        const campaignId = normalizeString(campaign.id);
        if (!campaignId) return null;

        return fetchInstantly<unknown>(
          "/leads/list",
          {
            method: "POST",
            body: JSON.stringify({
              campaign_id: campaignId,
              limit: 100,
              in_interest_status: 1,
            }),
          },
          apiKey,
        ).then((payload) => ({
          campaignId,
          campaignName: normalizeString(campaign.name) || campaignId,
          leads: normalizeLeads(payload),
        }));
      })
      .filter((entry): entry is Promise<{ campaignId: string; campaignName: string; leads: InstantlyLead[] }> => entry !== null),
  );

  const deduped = new Map<string, NormalizedInstantlyLead>();

  for (const response of responses) {
    for (const lead of response.leads) {
      const email = normalizeString(lead.email).toLowerCase();
      if (!email || deduped.has(email)) continue;

      deduped.set(email, {
        email,
        company: normalizeString(lead.company_name) || fallbackName(email),
        campaign: response.campaignName,
        firstName: normalizeString(lead.first_name),
        lastName: normalizeString(lead.last_name),
        timestampCreated: normalizeString(lead.timestamp_created),
      });
    }
  }

  return Array.from(deduped.values());
}

function buildImportedDeal(lead: NormalizedInstantlyLead): PipelineDeal {
  const companyOrFallback = lead.company || fallbackName(lead.email);
  return {
    id: buildDealId(),
    stage: "new-lead",
    source: "instantly",
    email: lead.email,
    name: companyOrFallback,
    client: companyOrFallback,
    contact: formatContact(lead.firstName, lead.lastName),
    value: 0,
    assignee: "kimberly",
    notes: `Auto-imported from Instantly campaign: ${lead.campaign}`,
    enrichmentStatus: "pending",
    enrichmentData: null,
    createdAt: normalizeCreatedAt(lead.timestampCreated),
    status: "new",
    stageUpdatedAt: normalizeCreatedAt(lead.timestampCreated),
  };
}

async function runInstantlyImport(mode: ImportMode): Promise<InstantlyImportResult & InstantlySyncResult> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    throw new Error("INSTANTLY_API_KEY is not configured.");
  }

  const [pipelineDeals, instantlyLeads] = await Promise.all([getPipelineDeals(), fetchInterestedLeads(apiKey)]);
  const existingEmails = new Set(
    pipelineDeals.map((deal) => normalizeString(deal.email).toLowerCase()).filter(Boolean),
  );

  const newLeads = instantlyLeads
    .filter((lead) => !existingEmails.has(lead.email))
    .map((lead) => ({
      email: lead.email,
      company: lead.company,
      campaign: lead.campaign,
    }));

  if (mode === "import" && newLeads.length > 0) {
    const importedDeals = instantlyLeads
      .filter((lead) => !existingEmails.has(lead.email))
      .map((lead) => buildImportedDeal(lead));
    await writePipelineDeals([...pipelineDeals, ...importedDeals]);
  }

  return {
    imported: mode === "import" ? newLeads.length : 0,
    skipped: instantlyLeads.length - newLeads.length,
    total: instantlyLeads.length,
    newLeads,
    count: newLeads.length,
  };
}

export async function importInterestedInstantlyLeads(): Promise<InstantlyImportResult> {
  const result = await runInstantlyImport("import");
  return {
    imported: result.imported,
    skipped: result.skipped,
    total: result.total,
  };
}

export async function previewInterestedInstantlyLeads(): Promise<InstantlySyncResult> {
  const result = await runInstantlyImport("dry-run");
  return {
    newLeads: result.newLeads,
    count: result.count,
  };
}
