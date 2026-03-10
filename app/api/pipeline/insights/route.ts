import { NextResponse } from "next/server";
import { PipelineDeal } from "@/lib/pipeline-types";

type InsightsRequest = {
  query?: string;
  contacts?: PipelineDeal[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function parseNotes(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as { rolodex?: unknown };
    if (parsed && typeof parsed === "object" && typeof parsed.rolodex === "string") {
      return parsed.rolodex.trim();
    }
  } catch {}

  return trimmed;
}

function getPrimaryName(contact: PipelineDeal) {
  return contact.contact || contact.name;
}

function scoreContactMatch(contact: PipelineDeal, query: string) {
  const haystack = [
    getPrimaryName(contact),
    contact.name,
    contact.client,
    contact.email,
    contact.enrichmentData?.ownerName ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3);

  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function formatContactDetails(contact: PipelineDeal) {
  const notes = parseNotes(contact.notes);
  const enrichment = contact.enrichmentData;
  const phoneLog = contact.phoneLog.length
    ? contact.phoneLog.map((entry) => `- ${entry.date}: ${entry.notes}`).join("\n")
    : "- No phone calls logged yet.";

  const enrichmentLines = enrichment
    ? [
        enrichment.phone ? `- Phone: ${enrichment.phone}` : "",
        enrichment.website ? `- Website: ${enrichment.website}` : "",
        enrichment.ownerName ? `- Owner: ${enrichment.ownerName}` : "",
        enrichment.address ? `- Address: ${enrichment.address}` : "",
        enrichment.notes ? `- Enrichment notes: ${enrichment.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n") || "- No enrichment data."
    : "- No enrichment data.";

  return [
    `## ${getPrimaryName(contact)}`,
    ``,
    `- Company: ${contact.client}`,
    `- Stage: ${contact.stage}`,
    `- Email: ${contact.email || "No email"}`,
    `- Source: ${contact.source}`,
    ``,
    `### Notes`,
    notes || "No notes recorded.",
    ``,
    `### Phone Log`,
    phoneLog,
    ``,
    `### Enrichment`,
    enrichmentLines,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InsightsRequest;
    const query = normalize(body.query ?? "");
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];

    if (!query) {
      return NextResponse.json({
        response:
          "I can help with meeting prep, lead summaries, and follow-up recommendations. Try asking about a specific contact!",
      });
    }

    const matchedContact = contacts
      .map((contact) => ({ contact, score: scoreContactMatch(contact, query) }))
      .sort((a, b) => b.score - a.score)[0];

    if (matchedContact && matchedContact.score > 0 && !query.includes("follow-up") && !query.includes("meeting")) {
      return NextResponse.json({
        response: formatContactDetails(matchedContact.contact),
        contacts: [getPrimaryName(matchedContact.contact)],
      });
    }

    if (query.includes("follow-up")) {
      const followUps = contacts.filter((contact) => contact.stage === "contacted" || contact.stage === "new-lead");
      return NextResponse.json({
        response: followUps.length
          ? [
              "## Leads Needing Follow-Up",
              "",
              ...followUps.map((contact) => `- ${getPrimaryName(contact)} (${contact.client}) - ${contact.stage}`),
            ].join("\n")
          : "No leads are currently in `new-lead` or `contacted`.",
        contacts: followUps.map((contact) => getPrimaryName(contact)),
      });
    }

    if (query.includes("meeting")) {
      const meetings = contacts.filter(
        (contact) => contact.stage === "scheduled-meeting" || contact.stage === "attended-meeting",
      );
      return NextResponse.json({
        response: meetings.length
          ? [
              "## Meeting Prep",
              "",
              ...meetings.map((contact) => {
                const notes = parseNotes(contact.notes) || "No notes recorded.";
                return `### ${getPrimaryName(contact)}\n- Stage: ${contact.stage}\n- Company: ${contact.client}\n- Notes: ${notes}`;
              }),
            ].join("\n\n")
          : "No contacts are currently in `scheduled-meeting` or `attended-meeting`.",
        contacts: meetings.map((contact) => getPrimaryName(contact)),
      });
    }

    if (query.includes("interested")) {
      const interested = contacts.filter((contact) => contact.stage === "interested");
      return NextResponse.json({
        response: interested.length
          ? [
              "## Interested Leads",
              "",
              ...interested.map((contact) => `- ${getPrimaryName(contact)} (${contact.client})`),
            ].join("\n")
          : "No contacts are currently marked as `interested`.",
        contacts: interested.map((contact) => getPrimaryName(contact)),
      });
    }

    return NextResponse.json({
      response:
        "I can help with meeting prep, lead summaries, and follow-up recommendations. Try asking about a specific contact!",
    });
  } catch {
    return NextResponse.json({ error: "Unable to generate insights." }, { status: 500 });
  }
}
