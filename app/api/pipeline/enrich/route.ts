import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PipelineDeal } from "@/lib/pipeline-types";
import { extractLocationFromHtml, fetchWebsiteHtml, getDealWebsite } from "@/lib/enrich-utils";

type EnrichRequest =
  | {
      dealId: string;
      all?: never;
    }
  | {
      all: true;
      dealId?: never;
    };

type EnrichResult = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function normalizeWebsiteUrl(website: string): string {
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

function hasEnrichmentWebsite(deal: PipelineDeal) {
  return Boolean(getDealWebsite(deal));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<EnrichRequest>;

    if (!body.all && !body.dealId) {
      return NextResponse.json({ error: "Provide either dealId or all: true." }, { status: 400 });
    }

    const deals = await getPipelineDeals();
    const targets = body.all
      ? deals.filter(hasEnrichmentWebsite)
      : deals.filter((deal) => deal.id === body.dealId && hasEnrichmentWebsite(deal));

    if (!body.all && body.dealId && !deals.some((deal) => deal.id === body.dealId)) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    if (!body.all && body.dealId && targets.length === 0) {
      return NextResponse.json({ error: "Deal does not have a website to enrich." }, { status: 400 });
    }

    const results: EnrichResult[] = [];
    let enriched = 0;
    let failed = 0;

    for (let index = 0; index < targets.length; index += 1) {
      const deal = targets[index];
      const website = getDealWebsite(deal);

      if (!website) {
        failed += 1;
        results.push({
          id: deal.id,
          name: deal.name,
          city: normalizeString(deal.city),
          state: normalizeString(deal.state),
          error: "No website found.",
        });
        continue;
      }

      try {
        const html = await fetchWebsiteHtml(normalizeWebsiteUrl(website));
        const location = extractLocationFromHtml(html);

        if (!location) {
          throw new Error("Could not detect city/state from website.");
        }

        const existingIndex = deals.findIndex((entry) => entry.id === deal.id);
        if (existingIndex >= 0) {
          const current = deals[existingIndex];
          deals[existingIndex] = {
            ...current,
            city: location.city,
            state: location.state,
            enrichmentStatus: "enriched",
            enrichmentData: {
              ...(current.enrichmentData ?? {}),
              website: getDealWebsite(current) ?? website,
              enrichedAt: new Date().toISOString(),
            },
          };
        }

        enriched += 1;
        results.push({
          id: deal.id,
          name: deal.name,
          city: location.city,
          state: location.state,
        });
      } catch (caughtError) {
        const existingIndex = deals.findIndex((entry) => entry.id === deal.id);
        if (existingIndex >= 0) {
          const current = deals[existingIndex];
          deals[existingIndex] = {
            ...current,
            enrichmentStatus: "failed",
          };
        }

        failed += 1;
        results.push({
          id: deal.id,
          name: deal.name,
          city: normalizeString(deal.city),
          state: normalizeString(deal.state),
          error: caughtError instanceof Error ? caughtError.message : "Unable to enrich deal.",
        });
      }

      if (index < targets.length - 1) {
        await sleep(500);
      }
    }

    await writePipelineDeals(deals);

    return NextResponse.json({
      enriched,
      failed,
      results,
    });
  } catch {
    return NextResponse.json({ error: "Unable to enrich leads." }, { status: 500 });
  }
}
