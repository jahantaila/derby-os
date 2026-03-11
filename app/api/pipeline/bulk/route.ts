import { NextResponse } from "next/server";
import { appendPipelineActivity, createStageChangedActivity } from "@/lib/pipeline-activity";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PIPELINE_STAGES, PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

type BulkAction = "stage" | "tag" | "delete";

type BulkRequest = {
  ids?: unknown;
  action?: unknown;
  value?: unknown;
};

const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);

function isBulkAction(value: unknown): value is BulkAction {
  return value === "stage" || value === "tag" || value === "delete";
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    const normalized = entry.trim();
    if (!normalized) return;
    unique.add(normalized);
  });

  return [...unique];
}

function normalizeTag(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function addTag(tags: string[], value: string): string[] {
  const normalized = normalizeTag(value);
  if (!normalized) return tags;

  const key = normalized.toLowerCase();
  if (tags.some((tag) => tag.toLowerCase() === key)) return tags;
  return [...tags, normalized];
}

function easternIsoDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as BulkRequest;
    const ids = normalizeIds(body.ids);
    const action = body.action;

    if (!ids.length) {
      return NextResponse.json({ error: "At least one contact id is required." }, { status: 400 });
    }

    if (!isBulkAction(action)) {
      return NextResponse.json({ error: "Invalid bulk action." }, { status: 400 });
    }

    const deals = await getPipelineDeals();
    const targetIds = new Set(ids);
    const matchingDeals = deals.filter((deal) => targetIds.has(deal.id));
    const activityEntries = [];

    if (!matchingDeals.length) {
      return NextResponse.json({ error: "No matching contacts found." }, { status: 404 });
    }

    if (action === "delete") {
      const nextDeals = deals.filter((deal) => !targetIds.has(deal.id));
      await writePipelineDeals(nextDeals);
      return NextResponse.json({ ok: true, count: matchingDeals.length });
    }

    let nextDeals: PipelineDeal[] = deals;

    if (action === "stage") {
      if (typeof body.value !== "string" || !VALID_STAGES.has(body.value as PipelineStage)) {
        return NextResponse.json({ error: "A valid stage is required." }, { status: 400 });
      }

      const nextStage = body.value as PipelineStage;
      const today = easternIsoDate();
      nextDeals = deals.map((deal) =>
        !targetIds.has(deal.id)
          ? deal
          : {
              ...deal,
              stage: nextStage,
              stageUpdatedAt: deal.stage === nextStage ? deal.stageUpdatedAt ?? deal.createdAt : today,
            },
      );
      matchingDeals
        .filter((deal) => deal.stage !== nextStage)
        .forEach((deal) => {
          const nextDeal = nextDeals.find((entry) => entry.id === deal.id);
          if (nextDeal) activityEntries.push(createStageChangedActivity(deal, nextDeal));
        });
    }

    if (action === "tag") {
      const nextTag = normalizeTag(body.value);
      if (!nextTag) {
        return NextResponse.json({ error: "A tag value is required." }, { status: 400 });
      }

      nextDeals = deals.map((deal) =>
        !targetIds.has(deal.id)
          ? deal
          : {
              ...deal,
              tags: addTag(deal.tags, nextTag),
            },
      );
    }

    await writePipelineDeals(nextDeals);
    if (activityEntries.length) {
      await appendPipelineActivity(activityEntries);
    }
    return NextResponse.json({ ok: true, count: matchingDeals.length });
  } catch {
    return NextResponse.json({ error: "Unable to update selected contacts." }, { status: 500 });
  }
}
