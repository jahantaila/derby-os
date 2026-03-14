import fs from "fs";
import path from "path";
import type { RolodexContact } from "./rolodex-types";
import { SEED_CONTACTS } from "./rolodex-seed";

const DATA_DIR = path.join(process.cwd(), "..", "mission-control-data");
const DATA_FILE = path.join(DATA_DIR, "rolodex.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): RolodexContact[] {
  try {
    ensureDir();
    if (!fs.existsSync(DATA_FILE)) {
      // Seed on first run
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_CONTACTS, null, 2));
      } catch {
        // Read-only filesystem (e.g. Vercel) — return seed data
        return [...SEED_CONTACTS];
      }
      return SEED_CONTACTS;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [...SEED_CONTACTS];
  }
}

function writeAll(contacts: RolodexContact[]) {
  try {
    ensureDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(contacts, null, 2));
  } catch {
    // Read-only filesystem — silently fail (Vercel serverless)
    console.warn("rolodex-store: could not write to disk (read-only fs)");
  }
}

export function getAllContacts(): RolodexContact[] {
  return readAll();
}

export function getContact(id: string): RolodexContact | undefined {
  return readAll().find(c => c.id === id);
}

export function createContact(data: Partial<RolodexContact>): RolodexContact {
  const contacts = readAll();
  const contact: RolodexContact = {
    id: crypto.randomUUID(),
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    email: data.email,
    phone: data.phone,
    company: data.company,
    title: data.title,
    city: data.city,
    state: data.state,
    country: data.country,
    hometown: data.hometown,
    website: data.website,
    linkedin: data.linkedin,
    instagram: data.instagram,
    twitter: data.twitter,
    facebook: data.facebook,
    birthday: data.birthday,
    spouse: data.spouse,
    children: data.children,
    college: data.college,
    interests: data.interests,
    nickname: data.nickname,
    avatar: data.avatar,
    secondaryEmail: data.secondaryEmail,
    secondaryPhone: data.secondaryPhone,
    industry: data.industry,
    relationshipType: data.relationshipType ?? "other",
    tags: data.tags ?? [],
    howWeMet: data.howWeMet,
    metDate: data.metDate,
    introducedBy: data.introducedBy,
    relationshipScore: data.relationshipScore ?? 0,
    importanceScore: data.importanceScore,
    interactions: data.interactions ?? [],
    notes: data.notes ?? [],
    facts: data.facts ?? [],
    opportunities: data.opportunities ?? [],
    aiInsights: data.aiInsights ?? [],
    groups: data.groups ?? [],
    connections: data.connections ?? [],
    stayInTouch: data.stayInTouch,
    lastContactedAt: data.lastContactedAt,
    nextFollowUp: data.nextFollowUp,
    source: data.source,
    aiSummary: data.aiSummary,
    aiBriefing: data.aiBriefing,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archived: data.archived ?? false,
  };
  contacts.push(contact);
  writeAll(contacts);
  return contact;
}

export function updateContact(id: string, data: Partial<RolodexContact>): RolodexContact | null {
  const contacts = readAll();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...data, id, updatedAt: new Date().toISOString() };
  writeAll(contacts);
  return contacts[idx];
}

export function deleteContact(id: string): boolean {
  const contacts = readAll();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return false;
  contacts.splice(idx, 1);
  writeAll(contacts);
  return true;
}

export function bulkImport(
  contacts: Partial<RolodexContact>[],
  source: string,
  dedup: "email" | "phone" | "name" | "none" = "email"
): { created: number; skipped: number; contacts: RolodexContact[] } {
  const existing = readAll();
  let created = 0;
  let skipped = 0;
  const newContacts: RolodexContact[] = [];

  for (const data of contacts) {
    // Dedup check
    if (dedup !== "none") {
      const isDup = existing.some(e => {
        if (dedup === "email" && data.email && e.email) return e.email.toLowerCase() === data.email.toLowerCase();
        if (dedup === "phone" && data.phone && e.phone) return e.phone.replace(/\D/g, "") === data.phone.replace(/\D/g, "");
        if (dedup === "name") return `${e.firstName} ${e.lastName}`.toLowerCase() === `${data.firstName} ${data.lastName}`.toLowerCase();
        return false;
      });
      if (isDup) { skipped++; continue; }
    }

    const contact = createContact({ ...data, source: data.source ?? source });
    newContacts.push(contact);
    existing.push(contact);
    created++;
  }

  return { created, skipped, contacts: newContacts };
}
