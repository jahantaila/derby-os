import { NextResponse } from "next/server";
import { PipelineDeal } from "@/lib/pipeline-types";

type InsightHistoryEntry = {
  query?: string;
  response?: string;
};

type InsightsRequest = {
  query?: string;
  contacts?: PipelineDeal[];
  history?: InsightHistoryEntry[];
};

type InsightResult = {
  response: string;
  contacts?: string[];
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
    contact.city ?? "",
    contact.state ?? "",
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
    "",
    `- Company: ${contact.client}`,
    `- Stage: ${contact.stage}`,
    `- Email: ${contact.email || "No email"}`,
    `- Source: ${contact.source}`,
    "",
    "### Notes",
    notes || "No notes recorded.",
    "",
    "### Phone Log",
    phoneLog,
    "",
    "### Enrichment",
    enrichmentLines,
  ].join("\n");
}

function getDateValue(value?: string) {
  if (!value) return 0;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function buildHistoryContext(history: InsightHistoryEntry[]) {
  return history
    .slice(-4)
    .map((entry) => `${normalize(entry.query ?? "")} ${normalize(entry.response ?? "")}`)
    .join(" ");
}

function withContacts(response: string, contacts: PipelineDeal[]): InsightResult {
  return {
    response,
    contacts: contacts.map((contact) => getPrimaryName(contact)),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InsightsRequest;
    const query = normalize(body.query ?? "");
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];
    const history = Array.isArray(body.history) ? body.history : [];
    const contextualQuery = `${query} ${buildHistoryContext(history)}`.trim();

    if (!query) {
      return NextResponse.json({
        response:
          "I can help with hot leads, follow-up drafts, city breakdowns, and recent pipeline summaries. Try asking about a specific contact or segment.",
      });
    }

    const matchedContact = contacts
      .map((contact) => ({ contact, score: scoreContactMatch(contact, contextualQuery) }))
      .sort((left, right) => right.score - left.score)[0];

    if ((query.includes("hot lead") || query.includes("ready to close") || query.includes("close")) && contacts.length) {
      const hotLeads = contacts
        .filter((contact) => ["negotiating", "attended-meeting", "scheduled-meeting", "interested"].includes(contact.stage))
        .sort((left, right) => getDateValue(right.stageUpdatedAt ?? right.createdAt) - getDateValue(left.stageUpdatedAt ?? left.createdAt))
        .slice(0, 8);

      return NextResponse.json(
        hotLeads.length
          ? withContacts(
              [
                "## Hot Leads Ready To Close",
                "",
                ...hotLeads.map(
                  (contact) =>
                    `- ${getPrimaryName(contact)} (${contact.client}) - ${contact.stage} - Last stage update: ${contact.stageUpdatedAt ?? contact.createdAt}`,
                ),
              ].join("\n"),
              hotLeads,
            )
          : { response: "No leads are currently in the late-stage pipeline." },
      );
    }

    if ((query.includes("city") || query.includes("cities")) && contacts.length) {
      const cities = [...contacts.reduce((map, contact) => {
        const key = contact.city?.trim();
        if (!key) return map;
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>()).entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 8);

      return NextResponse.json({
        response: cities.length
          ? ["## Lead Volume By City", "", ...cities.map(([city, count]) => `- ${city}: ${count} lead${count === 1 ? "" : "s"}`)].join("\n")
          : "No city data is available for the current contacts.",
      });
    }

    if (query.includes("draft") && query.includes("follow-up")) {
      if (matchedContact && matchedContact.score > 0) {
        const notes = parseNotes(matchedContact.contact.notes) || "No notes recorded.";
        return NextResponse.json(
          withContacts(
            [
              `## Follow-Up Email For ${getPrimaryName(matchedContact.contact)}`,
              "",
              `Subject: Quick follow-up for ${matchedContact.contact.client}`,
              "",
              `Hi ${getPrimaryName(matchedContact.contact).split(" ")[0]},`,
              "",
              `Wanted to circle back on ${matchedContact.contact.client}. Based on my notes, ${notes}.`,
              "",
              "If it makes sense, I can send over a few concrete next steps and timelines for moving this forward.",
              "",
              "Best,",
              "Derby Digital",
            ].join("\n"),
            [matchedContact.contact],
          ),
        );
      }

      return NextResponse.json({
        response: "Name the contact you want and I can draft a follow-up email for them.",
      });
    }

    if (
      query.includes("2+ week") ||
      query.includes("2 week") ||
      query.includes("two week") ||
      query.includes("haven't contacted") ||
      query.includes("havent contacted")
    ) {
      const threshold = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const staleContacts = contacts
        .filter((contact) => getDateValue(contact.stageUpdatedAt ?? contact.createdAt) <= threshold)
        .filter((contact) => contact.stage !== "closed-won" && contact.stage !== "closed-lost")
        .sort((left, right) => getDateValue(left.stageUpdatedAt ?? left.createdAt) - getDateValue(right.stageUpdatedAt ?? right.createdAt));

      return NextResponse.json(
        staleContacts.length
          ? withContacts(
              [
                "## Leads Without Recent Movement",
                "",
                ...staleContacts.map(
                  (contact) => `- ${getPrimaryName(contact)} (${contact.client}) - ${contact.stage} - Last update: ${contact.stageUpdatedAt ?? contact.createdAt}`,
                ),
              ].join("\n"),
              staleContacts.slice(0, 12),
            )
          : { response: "No active leads appear to be stale for 2+ weeks." },
      );
    }

    if ((query.includes("this week") && query.includes("pipeline")) || query.includes("pipeline activity")) {
      const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const newContacts = contacts.filter((contact) => getDateValue(contact.createdAt) >= threshold);
      const updatedContacts = contacts.filter((contact) => getDateValue(contact.stageUpdatedAt ?? contact.createdAt) >= threshold);

      return NextResponse.json({
        response: [
          "## This Week's Pipeline Activity",
          "",
          `- New contacts added: ${newContacts.length}`,
          `- Contacts with stage movement: ${updatedContacts.length}`,
          `- Interested or later stage: ${contacts.filter((contact) => ["interested", "scheduled-meeting", "attended-meeting", "negotiating"].includes(contact.stage)).length}`,
          "",
          "### Most Recent Movement",
          ...updatedContacts
            .sort((left, right) => getDateValue(right.stageUpdatedAt ?? right.createdAt) - getDateValue(left.stageUpdatedAt ?? left.createdAt))
            .slice(0, 5)
            .map((contact) => `- ${getPrimaryName(contact)} moved through ${contact.stage} on ${contact.stageUpdatedAt ?? contact.createdAt}`),
        ].join("\n"),
        contacts: updatedContacts.slice(0, 5).map((contact) => getPrimaryName(contact)),
      });
    }

    if (query.includes("follow-up")) {
      const followUps = contacts.filter((contact) => contact.stage === "contacted" || contact.stage === "new-lead");
      return NextResponse.json(
        followUps.length
          ? withContacts(
              [
                "## Leads Needing Follow-Up",
                "",
                ...followUps.map((contact) => `- ${getPrimaryName(contact)} (${contact.client}) - ${contact.stage}`),
              ].join("\n"),
              followUps,
            )
          : { response: "No leads are currently in `new-lead` or `contacted`." },
      );
    }

    if (query.includes("meeting")) {
      const meetings = contacts.filter(
        (contact) => contact.stage === "scheduled-meeting" || contact.stage === "attended-meeting",
      );

      return NextResponse.json(
        meetings.length
          ? withContacts(
              [
                "## Meeting Prep",
                "",
                ...meetings.map((contact) => {
                  const notes = parseNotes(contact.notes) || "No notes recorded.";
                  return `### ${getPrimaryName(contact)}\n- Stage: ${contact.stage}\n- Company: ${contact.client}\n- Notes: ${notes}`;
                }),
              ].join("\n\n"),
              meetings,
            )
          : { response: "No contacts are currently in `scheduled-meeting` or `attended-meeting`." },
      );
    }

    if (query.includes("interested")) {
      const interested = contacts.filter((contact) => contact.stage === "interested");
      return NextResponse.json(
        interested.length
          ? withContacts(
              [
                "## Interested Leads",
                "",
                ...interested.map((contact) => `- ${getPrimaryName(contact)} (${contact.client})`),
              ].join("\n"),
              interested,
            )
          : { response: "No contacts are currently marked as `interested`." },
      );
    }

    if (matchedContact && matchedContact.score > 0) {
      return NextResponse.json({
        response: formatContactDetails(matchedContact.contact),
        contacts: [getPrimaryName(matchedContact.contact)],
      });
    }

    return NextResponse.json({
      response:
        "I can help with hot leads, follow-up drafts, city breakdowns, and recent pipeline summaries. Try asking about a specific contact or segment.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to generate insights." }, { status: 500 });
  }
}
