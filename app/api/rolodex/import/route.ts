import { NextRequest, NextResponse } from "next/server";
import { bulkImport } from "@/lib/rolodex-store";

/**
 * POST /api/rolodex/import
 *
 * Bulk import contacts from external sources.
 * Supports deduplication by email, phone, or name.
 *
 * Body:
 * {
 *   source: "gmail" | "imessage" | "ghl" | "linkedin" | "facebook" | "instagram" | "csv" | "manual",
 *   dedup?: "email" | "phone" | "name" | "none",  // default: "email"
 *   contacts: [
 *     {
 *       firstName: string,
 *       lastName?: string,
 *       email?: string,
 *       phone?: string,
 *       company?: string,
 *       title?: string,
 *       city?: string,
 *       state?: string,
 *       country?: string,
 *       relationshipType?: string,
 *       tags?: string[],
 *       groups?: string[],
 *       notes?: [{ content: string }],
 *       howWeMet?: string,
 *       linkedin?: string,
 *       instagram?: string,
 *       facebook?: string,
 *       twitter?: string,
 *       website?: string,
 *       birthday?: string,
 *       // ... any RolodexContact field
 *     }
 *   ]
 * }
 *
 * Source-specific mapping notes:
 *
 * Gmail:     firstName, lastName, email (primary), phone, company, title, birthday
 *            groups → Google contact groups, tags → labels
 *
 * iMessage:  firstName, lastName, phone (primary), email
 *            howWeMet → "iMessage", source → "imessage"
 *
 * GHL:       firstName, lastName, email, phone, company, tags, city, state
 *            source → "ghl", groups → ["GHL Import - {date}"]
 *
 * LinkedIn:  firstName, lastName, email, company, title, linkedin URL
 *            source → "linkedin", groups → ["LinkedIn Import - {date}"]
 *            howWeMet → "LinkedIn"
 *
 * Facebook:  firstName, lastName, facebook URL
 *            source → "facebook"
 *
 * Instagram: firstName (handle), instagram URL
 *            source → "instagram"
 *
 * CSV:       Any field mapping, source → "csv"
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, contacts, dedup } = body;

    if (!source) {
      return NextResponse.json({ error: "source is required" }, { status: 400 });
    }
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "contacts array is required and must not be empty" }, { status: 400 });
    }
    if (contacts.length > 1000) {
      return NextResponse.json({ error: "Maximum 1000 contacts per import" }, { status: 400 });
    }

    // Add import group with timestamp
    const importGroup = `${source.charAt(0).toUpperCase() + source.slice(1)} Import - ${new Date().toISOString().split("T")[0]}`;
    const enriched = contacts.map((c: any) => ({
      ...c,
      source: c.source ?? source,
      groups: [...(c.groups ?? []), importGroup],
    }));

    const result = bulkImport(enriched, source, dedup ?? "email");

    return NextResponse.json({
      source,
      created: result.created,
      skipped: result.skipped,
      total: contacts.length,
      importGroup,
      contacts: result.contacts.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email })),
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Invalid request" }, { status: 400 });
  }
}
