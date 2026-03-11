import fs from "fs/promises";
import path from "path";
import { getPipelineDeals } from "@/lib/pipeline-store";
import {
  INTERACTION_TYPES,
  Interaction,
  InteractionType,
  REMINDER_FREQUENCIES,
  RelationshipType,
  RELATIONSHIP_TYPES,
  RolodexContact,
  StayInTouchReminder,
} from "@/lib/rolodex-types";

const DATA_DIR = path.join(process.env.HOME || "/home/kim", "mission-control-data");
const ROLODEX_FILE = "rolodex.json";
const VALID_RELATIONSHIP_TYPES = new Set<RelationshipType>(RELATIONSHIP_TYPES);
const VALID_INTERACTION_TYPES = new Set<InteractionType>(INTERACTION_TYPES);
const VALID_REMINDER_FREQUENCIES = new Set<string>(REMINDER_FREQUENCIES);

export type RolodexContactInput = Partial<Omit<RolodexContact, "id" | "interactions" | "relationshipScore" | "lastContactedAt" | "nextFollowUp" | "createdAt" | "updatedAt" | "archived" | "stayInTouch">> & {
  firstName?: string;
  lastName?: string;
  interactions?: Interaction[];
  stayInTouch?: StayInTouchReminder | null;
  archived?: boolean;
};

export type InteractionInput = {
  type?: InteractionType;
  date?: string;
  summary?: string;
  details?: string;
  sentiment?: Interaction["sentiment"];
};

function easternDate(value = new Date()) {
  return value.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function isoTimestamp() {
  return new Date().toISOString();
}

function buildId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || undefined;
}

function normalizeDate(value: unknown) {
  const normalized = normalizeString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return undefined;
}

function normalizeRelationshipType(value: unknown): RelationshipType {
  return typeof value === "string" && VALID_RELATIONSHIP_TYPES.has(value as RelationshipType)
    ? (value as RelationshipType)
    : "other";
}

function normalizeInteractionType(value: unknown): InteractionType {
  return typeof value === "string" && VALID_INTERACTION_TYPES.has(value as InteractionType)
    ? (value as InteractionType)
    : "note";
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry) => normalizeString(entry))
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (!entry || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeReminder(value: unknown): StayInTouchReminder | undefined {
  if (!isRecord(value)) return undefined;
  const frequency = normalizeString(value.frequency);
  if (!VALID_REMINDER_FREQUENCIES.has(frequency)) return undefined;

  const customDaysRaw = typeof value.customDays === "number" ? value.customDays : Number(value.customDays);
  const customDays = Number.isFinite(customDaysRaw) && customDaysRaw > 0 ? Math.round(customDaysRaw) : undefined;

  return {
    frequency: frequency as StayInTouchReminder["frequency"],
    customDays,
    lastReminded: normalizeDate(value.lastReminded),
    snoozedUntil: normalizeDate(value.snoozedUntil),
  };
}

function normalizeInteraction(value: unknown): Interaction | null {
  if (!isRecord(value)) return null;
  const id = normalizeString(value.id);
  const summary = normalizeString(value.summary);
  const date = normalizeDate(value.date) ?? easternDate();
  if (!id || !summary) return null;

  const sentiment = value.sentiment === "positive" || value.sentiment === "neutral" || value.sentiment === "negative" ? value.sentiment : undefined;

  return {
    id,
    type: normalizeInteractionType(value.type),
    date,
    summary,
    details: normalizeOptionalString(value.details),
    sentiment,
    createdAt: normalizeString(value.createdAt) || isoTimestamp(),
  };
}

function sortInteractions(interactions: Interaction[]) {
  return [...interactions].sort((left, right) => {
    const dateDelta = right.date.localeCompare(left.date);
    if (dateDelta !== 0) return dateDelta;
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function diffDaysFromToday(date: string) {
  const today = new Date(`${easternDate()}T12:00:00.000Z`).getTime();
  const target = new Date(`${date}T12:00:00.000Z`).getTime();
  if (Number.isNaN(today) || Number.isNaN(target)) return Number.POSITIVE_INFINITY;
  return Math.floor((today - target) / 86400000);
}

function reminderDays(reminder?: StayInTouchReminder) {
  if (!reminder) return undefined;
  if (reminder.frequency === "weekly") return 7;
  if (reminder.frequency === "biweekly") return 14;
  if (reminder.frequency === "monthly") return 30;
  if (reminder.frequency === "quarterly") return 90;
  if (reminder.frequency === "yearly") return 365;
  if (reminder.frequency === "custom") return reminder.customDays && reminder.customDays > 0 ? reminder.customDays : undefined;
  return undefined;
}

function detectInbound(interactions: Interaction[]) {
  return interactions.some((interaction) => {
    const haystack = `${interaction.summary} ${interaction.details ?? ""}`.toLowerCase();
    return (
      interaction.type === "meeting" ||
      interaction.type === "referral" ||
      interaction.type === "deal" ||
      interaction.type === "event" ||
      haystack.includes("reply") ||
      haystack.includes("replied") ||
      haystack.includes("inbound") ||
      haystack.includes("introduced") ||
      haystack.includes("sent over")
    );
  });
}

function computeRelationshipScore(contact: Pick<
  RolodexContact,
  | "birthday"
  | "children"
  | "email"
  | "facebook"
  | "favoriteFood"
  | "instagram"
  | "interactions"
  | "interests"
  | "lastContactedAt"
  | "linkedin"
  | "personalNotes"
  | "phone"
  | "secondaryEmail"
  | "secondaryPhone"
  | "spouse"
  | "stayInTouch"
  | "twitter"
  | "website"
>) {
  let score = 0;
  const recencyDays = contact.lastContactedAt ? diffDaysFromToday(contact.lastContactedAt) : Number.POSITIVE_INFINITY;
  if (recencyDays <= 7) score += 30;
  else if (recencyDays <= 30) score += 20;
  else if (recencyDays <= 90) score += 10;

  const interactionCount = contact.interactions.length;
  if (interactionCount >= 10) score += 25;
  else if (interactionCount >= 5) score += 15;
  else if (interactionCount >= 2) score += 10;
  else if (interactionCount >= 1) score += 5;

  if (contact.birthday || contact.spouse || contact.children || contact.interests || contact.favoriteFood || contact.personalNotes) {
    score += 10;
  }
  if (contact.phone || contact.secondaryPhone) score += 5;

  const contactMethods = [
    contact.email,
    contact.secondaryEmail,
    contact.phone,
    contact.secondaryPhone,
    contact.linkedin,
    contact.instagram,
    contact.twitter,
    contact.facebook,
    contact.website,
  ].filter(Boolean).length;
  if (contactMethods >= 2) score += 5;

  contact.interactions.forEach((interaction) => {
    if (interaction.sentiment === "positive") score += 5;
    if (interaction.sentiment === "negative") score -= 5;
  });

  if (detectInbound(contact.interactions)) score += 15;
  return Math.max(0, Math.min(100, score));
}

function computeLastContactedAt(interactions: Interaction[]) {
  return sortInteractions(interactions)[0]?.date;
}

function computeNextFollowUp(lastContactedAt: string | undefined, reminder?: StayInTouchReminder, createdAt?: string) {
  if (!reminder) return undefined;
  if (reminder.snoozedUntil && reminder.snoozedUntil > easternDate()) return reminder.snoozedUntil;
  const days = reminderDays(reminder);
  if (!days) return undefined;
  return addDays(lastContactedAt ?? createdAt ?? easternDate(), days);
}

function normalizeContact(raw: unknown): RolodexContact | null {
  if (!isRecord(raw)) return null;
  const id = normalizeString(raw.id);
  const firstName = normalizeString(raw.firstName);
  const lastName = normalizeString(raw.lastName);
  if (!id || !firstName) return null;

  const createdAt = normalizeString(raw.createdAt) || isoTimestamp();
  const interactions = sortInteractions(
    Array.isArray(raw.interactions) ? raw.interactions.map((entry) => normalizeInteraction(entry)).filter((entry): entry is Interaction => entry !== null) : [],
  );
  const stayInTouch = normalizeReminder(raw.stayInTouch);
  const lastContactedAt = computeLastContactedAt(interactions) ?? normalizeDate(raw.lastContactedAt);

  const contact: RolodexContact = {
    id,
    firstName,
    lastName,
    nickname: normalizeOptionalString(raw.nickname),
    avatar: normalizeOptionalString(raw.avatar),
    email: normalizeOptionalString(raw.email),
    phone: normalizeOptionalString(raw.phone),
    secondaryEmail: normalizeOptionalString(raw.secondaryEmail),
    secondaryPhone: normalizeOptionalString(raw.secondaryPhone),
    company: normalizeOptionalString(raw.company),
    title: normalizeOptionalString(raw.title),
    industry: normalizeOptionalString(raw.industry),
    website: normalizeOptionalString(raw.website),
    city: normalizeOptionalString(raw.city),
    state: normalizeOptionalString(raw.state),
    country: normalizeOptionalString(raw.country),
    relationshipType: normalizeRelationshipType(raw.relationshipType),
    tags: normalizeTags(raw.tags),
    howWeMet: normalizeOptionalString(raw.howWeMet),
    metDate: normalizeDate(raw.metDate),
    introducedBy: normalizeOptionalString(raw.introducedBy),
    birthday: normalizeDate(raw.birthday),
    spouse: normalizeOptionalString(raw.spouse),
    children: normalizeOptionalString(raw.children),
    interests: normalizeOptionalString(raw.interests),
    favoriteFood: normalizeOptionalString(raw.favoriteFood),
    personalNotes: normalizeOptionalString(raw.personalNotes),
    linkedin: normalizeOptionalString(raw.linkedin),
    instagram: normalizeOptionalString(raw.instagram),
    twitter: normalizeOptionalString(raw.twitter),
    facebook: normalizeOptionalString(raw.facebook),
    interactions,
    stayInTouch,
    relationshipScore: 0,
    lastContactedAt,
    nextFollowUp: undefined,
    pipelineDealId: normalizeOptionalString(raw.pipelineDealId),
    createdAt,
    updatedAt: normalizeString(raw.updatedAt) || createdAt,
    archived: Boolean(raw.archived),
  };

  contact.relationshipScore = computeRelationshipScore(contact);
  contact.nextFollowUp = computeNextFollowUp(contact.lastContactedAt, stayInTouch, contact.createdAt.slice(0, 10));
  return contact;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readRolodexFile(): Promise<RolodexContact[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, ROLODEX_FILE), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeContact(entry))
      .filter((entry): entry is RolodexContact => entry !== null)
      .sort((left, right) => left.firstName.localeCompare(right.firstName) || left.lastName.localeCompare(right.lastName));
  } catch {
    return [];
  }
}

async function writeRolodexFile(contacts: RolodexContact[]) {
  await ensureDataDir();
  await fs.writeFile(path.join(DATA_DIR, ROLODEX_FILE), JSON.stringify(contacts, null, 2), "utf-8");
}

function createContactFromInput(input: RolodexContactInput): RolodexContact | null {
  const firstName = normalizeString(input.firstName);
  const lastName = normalizeString(input.lastName);
  if (!firstName) return null;
  const today = easternDate();
  const now = isoTimestamp();
  const interactions = sortInteractions(
    Array.isArray(input.interactions)
      ? input.interactions.map((entry) => normalizeInteraction(entry)).filter((entry): entry is Interaction => entry !== null)
      : [],
  );
  const stayInTouch = normalizeReminder(input.stayInTouch);

  const contact: RolodexContact = {
    id: buildId("rc"),
    firstName,
    lastName: lastName || "",
    nickname: normalizeOptionalString(input.nickname),
    avatar: normalizeOptionalString(input.avatar),
    email: normalizeOptionalString(input.email),
    phone: normalizeOptionalString(input.phone),
    secondaryEmail: normalizeOptionalString(input.secondaryEmail),
    secondaryPhone: normalizeOptionalString(input.secondaryPhone),
    company: normalizeOptionalString(input.company),
    title: normalizeOptionalString(input.title),
    industry: normalizeOptionalString(input.industry),
    website: normalizeOptionalString(input.website),
    city: normalizeOptionalString(input.city),
    state: normalizeOptionalString(input.state),
    country: normalizeOptionalString(input.country),
    relationshipType: normalizeRelationshipType(input.relationshipType),
    tags: normalizeTags(input.tags),
    howWeMet: normalizeOptionalString(input.howWeMet),
    metDate: normalizeDate(input.metDate),
    introducedBy: normalizeOptionalString(input.introducedBy),
    birthday: normalizeDate(input.birthday),
    spouse: normalizeOptionalString(input.spouse),
    children: normalizeOptionalString(input.children),
    interests: normalizeOptionalString(input.interests),
    favoriteFood: normalizeOptionalString(input.favoriteFood),
    personalNotes: normalizeOptionalString(input.personalNotes),
    linkedin: normalizeOptionalString(input.linkedin),
    instagram: normalizeOptionalString(input.instagram),
    twitter: normalizeOptionalString(input.twitter),
    facebook: normalizeOptionalString(input.facebook),
    interactions,
    stayInTouch,
    relationshipScore: 0,
    lastContactedAt: computeLastContactedAt(interactions),
    nextFollowUp: undefined,
    pipelineDealId: normalizeOptionalString(input.pipelineDealId),
    createdAt: now,
    updatedAt: now,
    archived: false,
  };

  contact.relationshipScore = computeRelationshipScore(contact);
  contact.nextFollowUp = computeNextFollowUp(contact.lastContactedAt, stayInTouch, today);
  return contact;
}

function applyPatch(current: RolodexContact, patch: RolodexContactInput): RolodexContact {
  const interactions =
    patch.interactions === undefined
      ? current.interactions
      : sortInteractions(
          patch.interactions.map((entry) => normalizeInteraction(entry)).filter((entry): entry is Interaction => entry !== null),
        );
  const stayInTouch = patch.stayInTouch === undefined ? current.stayInTouch : normalizeReminder(patch.stayInTouch);

  const updated: RolodexContact = {
    ...current,
    firstName: patch.firstName?.trim() || current.firstName,
    lastName: patch.lastName?.trim() || current.lastName,
    nickname: patch.nickname === undefined ? current.nickname : normalizeOptionalString(patch.nickname),
    avatar: patch.avatar === undefined ? current.avatar : normalizeOptionalString(patch.avatar),
    email: patch.email === undefined ? current.email : normalizeOptionalString(patch.email),
    phone: patch.phone === undefined ? current.phone : normalizeOptionalString(patch.phone),
    secondaryEmail: patch.secondaryEmail === undefined ? current.secondaryEmail : normalizeOptionalString(patch.secondaryEmail),
    secondaryPhone: patch.secondaryPhone === undefined ? current.secondaryPhone : normalizeOptionalString(patch.secondaryPhone),
    company: patch.company === undefined ? current.company : normalizeOptionalString(patch.company),
    title: patch.title === undefined ? current.title : normalizeOptionalString(patch.title),
    industry: patch.industry === undefined ? current.industry : normalizeOptionalString(patch.industry),
    website: patch.website === undefined ? current.website : normalizeOptionalString(patch.website),
    city: patch.city === undefined ? current.city : normalizeOptionalString(patch.city),
    state: patch.state === undefined ? current.state : normalizeOptionalString(patch.state),
    country: patch.country === undefined ? current.country : normalizeOptionalString(patch.country),
    relationshipType: patch.relationshipType === undefined ? current.relationshipType : normalizeRelationshipType(patch.relationshipType),
    tags: patch.tags === undefined ? current.tags : normalizeTags(patch.tags),
    howWeMet: patch.howWeMet === undefined ? current.howWeMet : normalizeOptionalString(patch.howWeMet),
    metDate: patch.metDate === undefined ? current.metDate : normalizeDate(patch.metDate),
    introducedBy: patch.introducedBy === undefined ? current.introducedBy : normalizeOptionalString(patch.introducedBy),
    birthday: patch.birthday === undefined ? current.birthday : normalizeDate(patch.birthday),
    spouse: patch.spouse === undefined ? current.spouse : normalizeOptionalString(patch.spouse),
    children: patch.children === undefined ? current.children : normalizeOptionalString(patch.children),
    interests: patch.interests === undefined ? current.interests : normalizeOptionalString(patch.interests),
    favoriteFood: patch.favoriteFood === undefined ? current.favoriteFood : normalizeOptionalString(patch.favoriteFood),
    personalNotes: patch.personalNotes === undefined ? current.personalNotes : normalizeOptionalString(patch.personalNotes),
    linkedin: patch.linkedin === undefined ? current.linkedin : normalizeOptionalString(patch.linkedin),
    instagram: patch.instagram === undefined ? current.instagram : normalizeOptionalString(patch.instagram),
    twitter: patch.twitter === undefined ? current.twitter : normalizeOptionalString(patch.twitter),
    facebook: patch.facebook === undefined ? current.facebook : normalizeOptionalString(patch.facebook),
    interactions,
    stayInTouch,
    pipelineDealId: patch.pipelineDealId === undefined ? current.pipelineDealId : normalizeOptionalString(patch.pipelineDealId),
    archived: typeof patch.archived === "boolean" ? patch.archived : current.archived,
    updatedAt: isoTimestamp(),
    relationshipScore: 0,
    lastContactedAt: computeLastContactedAt(interactions),
    nextFollowUp: undefined,
  };

  updated.relationshipScore = computeRelationshipScore(updated);
  updated.nextFollowUp = computeNextFollowUp(updated.lastContactedAt, stayInTouch, updated.createdAt.slice(0, 10));
  return updated;
}

function buildPipelineImportContact(deal: Awaited<ReturnType<typeof getPipelineDeals>>[number]): RolodexContactInput | null {
  const name = normalizeString(deal.contact || deal.name);
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || deal.client || "Contact";
  return {
    firstName,
    lastName,
    email: normalizeOptionalString(deal.email),
    phone: normalizeOptionalString(deal.enrichmentData?.phone),
    company: normalizeOptionalString(deal.client),
    title: undefined,
    website: normalizeOptionalString(deal.website ?? deal.enrichmentData?.website),
    city: normalizeOptionalString(deal.city),
    state: normalizeOptionalString(deal.state),
    relationshipType: deal.stage === "closed-won" ? "client" : "prospect",
    tags: deal.tags,
    howWeMet: deal.source ? `Imported from pipeline (${deal.source})` : "Imported from pipeline",
    metDate: normalizeDate(deal.createdAt),
    personalNotes: normalizeOptionalString(deal.notes),
    pipelineDealId: deal.id,
  };
}

export async function getRolodexContacts(options?: { includeArchived?: boolean }) {
  const contacts = await readRolodexFile();
  return options?.includeArchived ? contacts : contacts.filter((contact) => !contact.archived);
}

export async function getRolodexContactById(id: string) {
  return (await readRolodexFile()).find((contact) => contact.id === id) ?? null;
}

export async function createRolodexContact(input: RolodexContactInput) {
  const contact = createContactFromInput(input);
  if (!contact) return null;
  const contacts = await readRolodexFile();
  contacts.push(contact);
  await writeRolodexFile(contacts);
  return contact;
}

export async function updateRolodexContact(id: string, patch: RolodexContactInput) {
  const contacts = await readRolodexFile();
  const index = contacts.findIndex((contact) => contact.id === id);
  if (index < 0) return null;
  const updated = applyPatch(contacts[index], patch);
  contacts[index] = updated;
  await writeRolodexFile(contacts);
  return updated;
}

export async function archiveRolodexContact(id: string) {
  return updateRolodexContact(id, { archived: true });
}

export async function addRolodexInteraction(contactId: string, input: InteractionInput) {
  const contacts = await readRolodexFile();
  const index = contacts.findIndex((contact) => contact.id === contactId);
  if (index < 0) return null;
  const summary = normalizeString(input.summary);
  if (!summary) return null;
  const interaction: Interaction = {
    id: buildId("ri"),
    type: normalizeInteractionType(input.type),
    date: normalizeDate(input.date) ?? easternDate(),
    summary,
    details: normalizeOptionalString(input.details),
    sentiment: input.sentiment === "positive" || input.sentiment === "neutral" || input.sentiment === "negative" ? input.sentiment : undefined,
    createdAt: isoTimestamp(),
  };
  contacts[index] = applyPatch(contacts[index], {
    interactions: sortInteractions([interaction, ...contacts[index].interactions]),
  });
  await writeRolodexFile(contacts);
  return { contact: contacts[index], interaction };
}

export async function deleteRolodexInteraction(contactId: string, interactionId: string) {
  const contacts = await readRolodexFile();
  const index = contacts.findIndex((contact) => contact.id === contactId);
  if (index < 0) return null;
  const nextInteractions = contacts[index].interactions.filter((interaction) => interaction.id !== interactionId);
  if (nextInteractions.length === contacts[index].interactions.length) return null;
  contacts[index] = applyPatch(contacts[index], { interactions: nextInteractions });
  await writeRolodexFile(contacts);
  return contacts[index];
}

export async function getRolodexReminders() {
  const today = easternDate();
  const contacts = await getRolodexContacts();

  return contacts
    .map((contact) => {
      if (!contact.stayInTouch) return null;
      if (contact.stayInTouch.snoozedUntil && contact.stayInTouch.snoozedUntil > today) return null;
      const dueDate = contact.nextFollowUp ?? computeNextFollowUp(contact.lastContactedAt, contact.stayInTouch, contact.createdAt.slice(0, 10));
      if (!dueDate) return null;
      if (dueDate > today) return null;
      return {
        ...contact,
        nextFollowUp: dueDate,
        overdueDays: Math.max(0, diffDaysFromToday(dueDate)),
      };
    })
    .filter((contact): contact is RolodexContact & { overdueDays: number } => contact !== null)
    .sort((left, right) => right.overdueDays - left.overdueDays || right.relationshipScore - left.relationshipScore);
}

export async function importPipelineContacts(input?: { dealIds?: string[] }) {
  const [deals, existing] = await Promise.all([getPipelineDeals(), readRolodexFile()]);
  const selectedIds = new Set((input?.dealIds ?? []).map((entry) => entry.trim()).filter(Boolean));
  const sourceDeals = selectedIds.size ? deals.filter((deal) => selectedIds.has(deal.id)) : deals;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const createdContacts: RolodexContact[] = [];
  const updatedContacts: RolodexContact[] = [];
  const next = [...existing];

  for (const deal of sourceDeals) {
    const payload = buildPipelineImportContact(deal);
    if (!payload) {
      skipped += 1;
      continue;
    }

    const byPipelineId = next.findIndex((contact) => contact.pipelineDealId === deal.id);
    const email = payload.email?.toLowerCase();
    const byEmail = email ? next.findIndex((contact) => contact.email?.toLowerCase() === email) : -1;
    const targetIndex = byPipelineId >= 0 ? byPipelineId : byEmail;

    if (targetIndex >= 0) {
      const merged = applyPatch(next[targetIndex], payload);
      next[targetIndex] = merged;
      updated += 1;
      updatedContacts.push(merged);
      continue;
    }

    const created = createContactFromInput(payload);
    if (!created) {
      skipped += 1;
      continue;
    }
    next.push(created);
    imported += 1;
    createdContacts.push(created);
  }

  await writeRolodexFile(next);
  return { imported, updated, skipped, createdContacts, updatedContacts };
}
