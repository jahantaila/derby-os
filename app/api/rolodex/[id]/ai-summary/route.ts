import { NextRequest, NextResponse } from "next/server";
import { getContact, updateContact } from "@/lib/rolodex-store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contact = getContact(params.id);
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    const recentInteractions = (contact.interactions ?? [])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15)
      .map(i => `[${i.date.split("T")[0]}] ${i.type}: ${i.summary}`)
      .join("\n");
    const notes = (contact.notes ?? [])
      .slice(0, 10)
      .map(n => `${n.pinned ? "📌 " : ""}${n.content}`)
      .join("\n");
    const facts = (contact.facts ?? [])
      .map(f => `${f.label}: ${f.value}`)
      .join("\n");
    const tags = (contact.tags ?? []).join(", ");
    const groups = (contact.groups ?? []).join(", ");

    const prompt = `You are a personal relationship intelligence assistant. Generate a brief, insightful summary of this person and your relationship with them. Be specific, actionable, and human. 2-3 sentences max.

**${name}**
${contact.company ? `Company: ${contact.company}` : ""}${contact.title ? ` | Title: ${contact.title}` : ""}
${contact.city ? `Location: ${contact.city}${contact.state ? `, ${contact.state}` : ""}` : ""}
${contact.relationshipType ? `Relationship: ${contact.relationshipType}` : ""}
${tags ? `Tags: ${tags}` : ""}
${groups ? `Groups: ${groups}` : ""}
${contact.howWeMet ? `How we met: ${contact.howWeMet}` : ""}
${contact.spouse ? `Spouse: ${contact.spouse}` : ""}
${contact.birthday ? `Birthday: ${contact.birthday}` : ""}
${contact.interests ? `Interests: ${contact.interests}` : ""}

${recentInteractions ? `Recent activity:\n${recentInteractions}` : "No recent activity."}
${notes ? `\nNotes:\n${notes}` : ""}
${facts ? `\nFacts:\n${facts}` : ""}

Write a concise relationship summary — who they are, relationship health, and what to do next. No bullet points. Conversational tone.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Save it to the contact
    updateContact(params.id, { aiSummary: summary });

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("AI summary error:", err);
    return NextResponse.json({ error: err.message ?? "Failed to generate summary" }, { status: 500 });
  }
}
