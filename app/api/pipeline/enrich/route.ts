import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PipelineDeal } from "@/lib/pipeline-types";

export const US_STATE_ABBREVS: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

type EnrichRequest =
  | {
      dealId: string;
      all?: never;
    }
  | {
      all: true;
      dealId?: never;
    };

type LocationMatch = {
  city: string;
  state: string;
};

type EnrichResult = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  error?: string;
};

const STATE_NAMES = Object.values(US_STATE_ABBREVS);
const STATE_NAMES_PATTERN = STATE_NAMES.map((state) => state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .sort((left, right) => right.length - left.length)
  .join("|");
const ADDRESS_PATTERN = new RegExp(
  String.raw`(?:\d{1,6}\s+[A-Za-z0-9.'#&/\- ]+,\s*)?([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)*),\s*([A-Z]{2}|${STATE_NAMES_PATTERN})\s+\d{5}(?:-\d{4})?`,
  "g",
);
const CITY_STATE_PATTERN = new RegExp(
  String.raw`([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)*),\s*([A-Z]{2}|${STATE_NAMES_PATTERN})(?:\b|[^A-Za-z])`,
  "g",
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCity(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized.replace(/^[,.\s]+|[,.\s]+$/g, "") || null;
}

function normalizeState(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  const cleaned = normalized.replace(/[.,]/g, "");
  const upper = cleaned.toUpperCase();

  if (US_STATE_ABBREVS[upper]) {
    return US_STATE_ABBREVS[upper];
  }

  const matchedState = STATE_NAMES.find((state) => state.toLowerCase() === cleaned.toLowerCase());
  return matchedState ?? null;
}

function buildLocation(city: unknown, state: unknown): LocationMatch | null {
  const normalizedCity = normalizeCity(city);
  const normalizedState = normalizeState(state);

  if (!normalizedCity || !normalizedState) return null;
  return { city: normalizedCity, state: normalizedState };
}

function getDealWebsite(deal: PipelineDeal): string | null {
  return normalizeString(deal.website) ?? normalizeString(deal.enrichmentData?.website);
}

function normalizeWebsiteUrl(website: string): string {
  if (/^https?:\/\//i.test(website)) return website;
  return `https://${website}`;
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    if (match[1]) blocks.push(match[1].trim());
  }

  return blocks;
}

function findLocationInJson(value: unknown): LocationMatch | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const location = findLocationInJson(entry);
      if (location) return location;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const direct = buildLocation(record.addressLocality, record.addressRegion);
  if (direct) return direct;

  const addressValue = record.address;
  if (addressValue && typeof addressValue === "object") {
    const addressRecord = addressValue as Record<string, unknown>;
    const addressLocation = buildLocation(addressRecord.addressLocality, addressRecord.addressRegion);
    if (addressLocation) return addressLocation;
  }

  for (const nested of Object.values(record)) {
    const location = findLocationInJson(nested);
    if (location) return location;
  }

  return null;
}

function extractFromJsonLd(html: string): LocationMatch | null {
  for (const block of extractJsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block) as unknown;
      const location = findLocationInJson(parsed);
      if (location) return location;
    } catch {}
  }

  return null;
}

function extractAttribute(tag: string, attribute: string): string | null {
  const pattern = new RegExp(`${attribute}=(["'])([\\s\\S]*?)\\1`, "i");
  const match = tag.match(pattern);
  return match?.[2] ? decodeHtmlEntities(match[2].trim()) : null;
}

function extractItempropValue(html: string, itemprop: string): string | null {
  const tagPattern = new RegExp(`<[^>]*itemprop=(["'])${itemprop}\\1[^>]*>`, "gi");

  for (const tagMatch of html.matchAll(tagPattern)) {
    const tag = tagMatch[0];
    const contentValue =
      extractAttribute(tag, "content") ??
      extractAttribute(tag, "value") ??
      extractAttribute(tag, "aria-label") ??
      extractAttribute(tag, "title");

    if (contentValue) return contentValue;

    const fullTagPattern = new RegExp(`(${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})([\\s\\S]*?)<\\/[^>]+>`, "i");
    const fullMatch = html.match(fullTagPattern);
    if (fullMatch?.[2]) {
      const textValue = stripTags(fullMatch[2]);
      if (textValue) return textValue;
    }
  }

  return null;
}

function extractFromMicrodata(html: string): LocationMatch | null {
  return buildLocation(extractItempropValue(html, "addressLocality"), extractItempropValue(html, "addressRegion"));
}

function extractMetaMap(html: string): Map<string, string> {
  const metaMap = new Map<string, string>();
  const metaPattern = /<meta\b[^>]*>/gi;

  for (const match of html.matchAll(metaPattern)) {
    const tag = match[0];
    const key =
      extractAttribute(tag, "property") ??
      extractAttribute(tag, "name") ??
      extractAttribute(tag, "itemprop") ??
      extractAttribute(tag, "http-equiv");
    const content = extractAttribute(tag, "content");

    if (!key || !content) continue;
    metaMap.set(key.toLowerCase(), content);
  }

  return metaMap;
}

function extractFromMetaTags(html: string): LocationMatch | null {
  const meta = extractMetaMap(html);

  return buildLocation(
    meta.get("og:locality") ?? meta.get("place:location:locality") ?? meta.get("place:location:city"),
    meta.get("og:region") ?? meta.get("place:location:region") ?? meta.get("place:location:state"),
  );
}

function extractFromAddressText(text: string): LocationMatch | null {
  for (const pattern of [ADDRESS_PATTERN, CITY_STATE_PATTERN]) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (!match) continue;
    const location = buildLocation(match[1], match[2]);
    if (location) return location;
  }

  return null;
}

function extractFromFooter(html: string): LocationMatch | null {
  const footerMatches = html.match(/<footer[\s\S]*?<\/footer>/gi) ?? [];

  for (const footer of footerMatches) {
    const location = extractFromAddressText(stripTags(footer));
    if (location) return location;
  }

  return extractFromAddressText(stripTags(html));
}

function extractFromGoogleMaps(html: string): LocationMatch | null {
  const iframePattern = /<iframe\b[^>]*src=(["'])([\s\S]*?)\1[^>]*>/gi;

  for (const match of html.matchAll(iframePattern)) {
    const src = decodeHtmlEntities(match[2] ?? "");
    if (!/google\.com\/maps/i.test(src)) continue;

    try {
      const url = new URL(src, "https://example.com");
      const q = url.searchParams.get("q");
      const center = url.searchParams.get("center");

      for (const candidate of [q, center]) {
        if (!candidate) continue;
        const location = extractFromAddressText(decodeURIComponent(candidate.replace(/\+/g, " ")));
        if (location) return location;
      }
    } catch {}
  }

  return null;
}

function extractLocationFromHtml(html: string): LocationMatch | null {
  return (
    extractFromJsonLd(html) ??
    extractFromMicrodata(html) ??
    extractFromMetaTags(html) ??
    extractFromFooter(html) ??
    extractFromGoogleMaps(html)
  );
}

async function fetchWebsiteHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Website responded with ${response.status}.`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function isEnrichableDeal(deal: PipelineDeal): boolean {
  return Boolean(getDealWebsite(deal)) && (!normalizeString(deal.city) || !normalizeString(deal.state));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<EnrichRequest>;

    if (!body.all && !body.dealId) {
      return NextResponse.json({ error: "Provide either dealId or all: true." }, { status: 400 });
    }

    const deals = await getPipelineDeals();
    const targets = body.all
      ? deals.filter(isEnrichableDeal)
      : deals.filter((deal) => deal.id === body.dealId && isEnrichableDeal(deal));

    if (!body.all && body.dealId && !deals.some((deal) => deal.id === body.dealId)) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    if (!body.all && body.dealId && targets.length === 0) {
      return NextResponse.json({ error: "Deal does not have an enrichable website/location." }, { status: 400 });
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
            city: normalizeString(current.city) ?? location.city,
            state: normalizeString(current.state) ?? location.state,
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
          city: normalizeString(deal.city) ?? location.city,
          state: normalizeString(deal.state) ?? location.state,
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
