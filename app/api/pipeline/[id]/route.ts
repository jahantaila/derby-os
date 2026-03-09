import { NextResponse } from "next/server";
import { getPipelineDeals, writePipelineDeals } from "@/lib/pipeline-store";
import { PIPELINE_ASSIGNEES, PIPELINE_STAGES, PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

type UpdateDealInput = Partial<Omit<PipelineDeal, "id" | "createdAt">>;

const VALID_STAGES = new Set<PipelineStage>(PIPELINE_STAGES);
const VALID_ASSIGNEES = new Set<string>(PIPELINE_ASSIGNEES);

function isStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && VALID_STAGES.has(value as PipelineStage);
}

function normalizeAssignee(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return VALID_ASSIGNEES.has(normalized) ? normalized : undefined;
}

function normalizeValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return undefined;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const patch = (await request.json()) as UpdateDealInput;
    const deals = getPipelineDeals();
    const index = deals.findIndex((deal) => deal.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    const current = deals[index];
    const nextStage = isStage(patch.stage) ? patch.stage : current.stage;
    const stageChanged = nextStage !== current.stage;
    const today = new Date().toISOString().slice(0, 10);
    const assignee = normalizeAssignee(patch.assignee);
    const nextValue = normalizeValue(patch.value);

    const updated: PipelineDeal = {
      ...current,
      name: patch.name?.trim() || current.name,
      stage: nextStage,
      value: nextValue ?? current.value,
      client: patch.client?.trim() || current.client,
      contact: patch.contact === undefined ? current.contact : patch.contact.trim(),
      assignee: assignee ?? current.assignee,
      notes: patch.notes === undefined ? current.notes : patch.notes.trim(),
      stageUpdatedAt: stageChanged ? today : current.stageUpdatedAt ?? current.createdAt,
    };

    deals[index] = updated;
    writePipelineDeals(deals);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update deal." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const deals = getPipelineDeals();
    const next = deals.filter((deal) => deal.id !== id);

    if (next.length === deals.length) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }

    writePipelineDeals(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete deal." }, { status: 500 });
  }
}
