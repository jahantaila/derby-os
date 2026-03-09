import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { EnrichmentData, PipelineDeal } from "@/lib/pipeline-types";

type EnrichInput = {
  phone?: string;
  ownerName?: string;
  address?: string;
  website?: string;
  googleRating?: number | string;
  reviewCount?: number | string;
  cuisine?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
  };
  notes?: string;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function buildEnrichment(input: EnrichInput): EnrichmentData {
  const social = input.socialMedia
    ? {
        ...(normalizeString(input.socialMedia.facebook) ? { facebook: normalizeString(input.socialMedia.facebook) } : {}),
        ...(normalizeString(input.socialMedia.instagram)
          ? { instagram: normalizeString(input.socialMedia.instagram) }
          : {}),
      }
    : undefined;

  return {
    ...(normalizeString(input.phone) ? { phone: normalizeString(input.phone) } : {}),
    ...(normalizeString(input.ownerName) ? { ownerName: normalizeString(input.ownerName) } : {}),
    ...(normalizeString(input.address) ? { address: normalizeString(input.address) } : {}),
    ...(normalizeString(input.website) ? { website: normalizeString(input.website) } : {}),
    ...(normalizeNumber(input.googleRating) !== undefined ? { googleRating: normalizeNumber(input.googleRating) } : {}),
    ...(normalizeNumber(input.reviewCount) !== undefined ? { reviewCount: normalizeNumber(input.reviewCount) } : {}),
    ...(normalizeString(input.cuisine) ? { cuisine: normalizeString(input.cuisine) } : {}),
    ...(social && (social.facebook || social.instagram) ? { socialMedia: social } : {}),
    ...(normalizeString(input.notes) ? { notes: normalizeString(input.notes) } : {}),
    enrichedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const input = (await request.json()) as EnrichInput;
    const deals = getPipelineDeals();
    const index = deals.findIndex((deal) => deal.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    const current = deals[index];
    const enriched: PipelineDeal = {
      ...current,
      enrichmentStatus: "enriched",
      enrichmentData: buildEnrichment(input),
    };

    deals[index] = enriched;
    writePipelineDeals(deals);
    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Unable to enrich deal." }, { status: 500 });
  }
}
