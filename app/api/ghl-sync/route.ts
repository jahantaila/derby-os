import { NextResponse } from "next/server";

const GHL_TOKEN = "pit-4ae0985d-8de0-40e6-b688-4e6805e57c58";
const GHL_LOC = "3zMwpehG9y8ETJsZtR3d";
const PIPELINE_ID = "oNcLIG8SGY8IKvvVbkDe";

// Known stage IDs from the RESTAURANTS pipeline
// These were set up during the GHL migration
const MEETING_BOOKED_STAGES = [
  // We'll discover these dynamically
];

async function ghlGet(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params, location_id: GHL_LOC }).toString();
  const url = `https://services.leadconnectorhq.com/${endpoint}?${qs}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GHL_TOKEN}`,
      Version: "2021-07-28",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "status";

  try {
    if (action === "opportunities") {
      // Get all opportunities from RESTAURANTS pipeline
      const data = await ghlGet("opportunities/search", {
        pipeline_id: PIPELINE_ID,
        limit: "20",
      });

      const opps = data.opportunities || [];
      const stages = new Map<string, string[]>();

      for (const opp of opps) {
        const stageId = opp.pipelineStageId;
        if (!stages.has(stageId)) stages.set(stageId, []);
        stages.get(stageId)!.push(opp.name);
      }

      return NextResponse.json({
        total: data.meta?.total || 0,
        fetched: opps.length,
        stages: Object.fromEntries(
          Array.from(stages.entries()).map(([id, names]) => [id, { count: names.length, examples: names.slice(0, 3) }])
        ),
        opportunities: opps.map((o: any) => ({
          id: o.id,
          name: o.name,
          stageId: o.pipelineStageId,
          status: o.status,
          contactId: o.contact?.id,
          contactName: o.contact?.name,
          contactEmail: o.contact?.email,
          contactPhone: o.contact?.phone,
          monetaryValue: o.monetaryValue,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        })),
      });
    }

    if (action === "contacts") {
      // Get contacts from GHL
      const data = await ghlGet("contacts", { limit: "20" });
      return NextResponse.json({
        total: data.meta?.total || data.contacts?.length || 0,
        contacts: (data.contacts || []).map((c: any) => ({
          id: c.id,
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          email: c.email,
          phone: c.phone,
          tags: c.tags,
          source: c.source,
          createdAt: c.dateAdded,
        })),
      });
    }

    return NextResponse.json({
      status: "ok",
      ghlLocation: GHL_LOC,
      pipeline: PIPELINE_ID,
      actions: ["opportunities", "contacts"],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
