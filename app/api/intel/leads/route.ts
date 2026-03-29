import { NextResponse } from "next/server";
import { supabaseReq } from "@/lib/finance-server";

type RawLead = Record<string, unknown>;

export type IntelLead = {
  id: string;
  restaurantName: string;
  ownerName: string;
  ownerStatus: "yes" | "no" | "unknown";
  phone: string;
  website: string;
  city: string;
  state: string;
  currentProvider: string;
  contactedStatus: "contacted" | "not_contacted" | "unknown";
};

function readString(row: RawLead, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readBoolean(row: RawLead, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "t", "yes", "y", "1"].includes(normalized)) return true;
      if (["false", "f", "no", "n", "0"].includes(normalized)) return false;
    }
  }
  return undefined;
}

function hasValueForAny(row: RawLead, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return true;
  }
  return false;
}

function normalizeWebsite(website: string) {
  if (!website) return "";
  return website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`;
}

function normalizeOwnerStatus(row: RawLead, ownerName: string): IntelLead["ownerStatus"] {
  const explicit = readBoolean(row, ["has_owner", "owner_known", "has_verified_owner"]);
  if (typeof explicit === "boolean") return explicit ? "yes" : "no";
  if (ownerName) return "yes";
  return "unknown";
}

function normalizeContactedStatus(row: RawLead): IntelLead["contactedStatus"] {
  const explicit = readBoolean(row, ["contacted", "is_contacted", "has_been_contacted"]);
  if (typeof explicit === "boolean") return explicit ? "contacted" : "not_contacted";

  if (hasValueForAny(row, ["contacted_at", "last_contacted_at", "campaign_started_at", "ghl_pushed_at"])) {
    return "contacted";
  }

  const rawStatus = readString(row, [
    "contacted_status",
    "outreach_status",
    "campaign_status",
    "status",
    "ghl_status",
  ]).toLowerCase();

  if (!rawStatus) return "unknown";
  if (["contacted", "sent", "active", "in progress", "in_progress", "replied", "synced", "pushed"].some((token) => rawStatus.includes(token))) {
    return "contacted";
  }
  if (["not contacted", "uncontacted", "new", "queued", "pending", "not_contacted"].some((token) => rawStatus.includes(token))) {
    return "not_contacted";
  }
  return "unknown";
}

function normalizeLead(row: RawLead, index: number): IntelLead {
  const ownerName = readString(row, ["owner_name", "owner", "contact_name", "primary_contact"]);
  const restaurantName = readString(row, ["restaurant_name", "business_name", "name", "restaurant"]);
  const city = readString(row, ["city", "locality"]) || "Unknown City";
  const state = readString(row, ["state", "province", "region"]).toUpperCase();
  const id = String(row.id ?? `${state || "NA"}-${city}-${restaurantName || "lead"}-${index}`);

  return {
    id,
    restaurantName: restaurantName || "Unnamed Restaurant",
    ownerName,
    ownerStatus: normalizeOwnerStatus(row, ownerName),
    phone: readString(row, ["phone", "phone_number", "telephone"]),
    website: normalizeWebsite(readString(row, ["website", "domain", "url"])),
    city,
    state,
    currentProvider: readString(row, ["current_provider", "provider", "platform", "website_provider"]),
    contactedStatus: normalizeContactedStatus(row),
  };
}

export async function GET() {
  try {
    const rows = (await supabaseReq("GET", "spothopper_leads", {
      params: "select=*",
    })) as RawLead[];

    const leads = rows
      .map((row, index) => normalizeLead(row, index))
      .sort((a, b) =>
        a.state.localeCompare(b.state) ||
        a.city.localeCompare(b.city) ||
        a.restaurantName.localeCompare(b.restaurantName)
      );

    return NextResponse.json({ leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load leads";
    return NextResponse.json({ error: message, leads: [] }, { status: 500 });
  }
}
