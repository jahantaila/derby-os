import { NextResponse } from "next/server";
import { getClientById, upsertClient } from "@/lib/clients-store";
import { ClientMarketingEffort, type ClientOnboardingData } from "@/lib/client-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toMarketingEfforts(value: unknown): ClientMarketingEffort[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<ClientMarketingEffort>(["Google Ads", "Meta Ads", "SEO", "Social Media", "Email Marketing", "None"]);
  const efforts = value
    .map((item) => toString(item))
    .filter((item): item is ClientMarketingEffort => valid.has(item as ClientMarketingEffort));

  if (efforts.includes("None")) return ["None"];
  return Array.from(new Set(efforts));
}

function toOnboardingData(body: unknown, businessName: string): ClientOnboardingData | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;

  return {
    businessName,
    ownerManagerName: toString(input.ownerManagerName),
    bestEmail: toString(input.bestEmail),
    bestPhone: toString(input.bestPhone),
    businessAddress: toString(input.businessAddress),
    websiteUrl: toString(input.websiteUrl),
    instagramUrl: toString(input.instagramUrl),
    facebookUrl: toString(input.facebookUrl),
    googleBusinessUrl: toString(input.googleBusinessUrl),
    businessHours: toString(input.businessHours),
    currentMarketingEfforts: toMarketingEfforts(input.currentMarketingEfforts),
    monthlyMarketingBudgetRange: toString(input.monthlyMarketingBudgetRange),
    biggestChallenges: toString(input.biggestChallenges),
    additionalInfo: toString(input.additionalInfo),
    submittedAt: new Date().toISOString(),
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const client = await getClientById(params.id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    clientId: client.id,
    businessName: client.name,
    onboarding: client.onboarding ?? null,
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const client = await getClientById(params.id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = toOnboardingData(body, client.name);
  if (!data) {
    return NextResponse.json({ error: "Invalid onboarding payload" }, { status: 400 });
  }

  const updatedClients = await upsertClient({
    ...client,
    onboarding: {
      linkCreatedAt: client.onboarding?.linkCreatedAt ?? new Date().toISOString(),
      data,
    },
  });
  const updated = updatedClients.find((entry) => entry.id === params.id) ?? null;

  return NextResponse.json({
    clientId: updated?.id ?? params.id,
    businessName: updated?.name ?? client.name,
    onboarding: updated?.onboarding ?? null,
  });
}
