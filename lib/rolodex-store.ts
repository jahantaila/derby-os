import { readPersistentData, writePersistentData } from "@/lib/persistence";
import { getPipelineDeals } from "@/lib/pipeline-store";
import {
  INTERACTION_TYPES,
  Interaction,
  InteractionType,
  RolodexNote,
  REMINDER_FREQUENCIES,
  RelationshipType,
  RELATIONSHIP_TYPES,
  RolodexContact,
  StayInTouchReminder,
} from "@/lib/rolodex-types";

const ROLODEX_FILE = "rolodex.json";
const VALID_RELATIONSHIP_TYPES = new Set<RelationshipType>(RELATIONSHIP_TYPES);
const VALID_INTERACTION_TYPES = new Set<InteractionType>(INTERACTION_TYPES);
const VALID_REMINDER_FREQUENCIES = new Set<string>(REMINDER_FREQUENCIES);

export type RolodexContactInput = Partial<Omit<RolodexContact, "id" | "interactions" | "notes" | "connections" | "relationshipScore" | "lastContactedAt" | "nextFollowUp" | "createdAt" | "updatedAt" | "archived" | "stayInTouch">> & {
  firstName?: string;
  lastName?: string;
  interactions?: Interaction[];
  notes?: RolodexNote[];
  connections?: string[];
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

function normalizeConnections(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry) => normalizeString(entry))
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
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

function normalizeNote(value: unknown): RolodexNote | null {
  if (!isRecord(value)) return null;
  const id = normalizeString(value.id);
  const content = normalizeString(value.content);
  if (!id || !content) return null;
  const createdAt = normalizeString(value.createdAt) || isoTimestamp();
  return {
    id,
    content,
    createdAt,
    updatedAt: normalizeString(value.updatedAt) || createdAt,
  };
}

function sortNotes(notes: RolodexNote[]) {
  return [...notes].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
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
  const notes = sortNotes(Array.isArray(raw.notes) ? raw.notes.map((entry) => normalizeNote(entry)).filter((entry): entry is RolodexNote => entry !== null) : []);
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
    notes,
    connections: normalizeConnections(raw.connections).filter((entry) => entry !== id),
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

async function readRolodexFile(): Promise<RolodexContact[]> {
  const raw = await readPersistentData<unknown[]>(ROLODEX_FILE, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeContact(entry))
    .filter((entry): entry is RolodexContact => entry !== null)
    .sort((left, right) => left.firstName.localeCompare(right.firstName) || left.lastName.localeCompare(right.lastName));
}

async function writeRolodexFile(contacts: RolodexContact[]) {
  await writePersistentData(ROLODEX_FILE, contacts);
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
  const notes = sortNotes(
    Array.isArray(input.notes) ? input.notes.map((entry) => normalizeNote(entry)).filter((entry): entry is RolodexNote => entry !== null) : [],
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
    notes,
    connections: normalizeConnections(input.connections),
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
  const notes =
    patch.notes === undefined
      ? current.notes
      : sortNotes(patch.notes.map((entry) => normalizeNote(entry)).filter((entry): entry is RolodexNote => entry !== null));
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
    notes,
    connections: patch.connections === undefined ? current.connections : normalizeConnections(patch.connections).filter((entry) => entry !== current.id),
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

export async function updateRolodexInteraction(contactId: string, interactionId: string, input: InteractionInput) {
  const contacts = await readRolodexFile();
  const index = contacts.findIndex((contact) => contact.id === contactId);
  if (index < 0) return null;

  const currentInteraction = contacts[index].interactions.find((interaction) => interaction.id === interactionId);
  if (!currentInteraction) return null;

  const summary = normalizeString(input.summary ?? currentInteraction.summary);
  if (!summary) return null;

  const nextInteractions = contacts[index].interactions.map((interaction) =>
    interaction.id === interactionId
      ? {
          ...interaction,
          type: input.type === undefined ? currentInteraction.type : normalizeInteractionType(input.type),
          date: normalizeDate(input.date) ?? currentInteraction.date,
          summary,
          details: input.details === undefined ? currentInteraction.details : normalizeOptionalString(input.details),
          sentiment:
            input.sentiment === undefined
              ? currentInteraction.sentiment
              : input.sentiment === "positive" || input.sentiment === "neutral" || input.sentiment === "negative"
                ? input.sentiment
                : undefined,
        }
      : interaction,
  );

  contacts[index] = applyPatch(contacts[index], { interactions: nextInteractions });
  await writeRolodexFile(contacts);
  return contacts[index];
}

export async function getRolodexReminders() {
  const today = easternDate();
  const contacts = await getRolodexContacts();
  const reminders: Array<RolodexContact & { nextFollowUp: string; overdueDays: number }> = [];

  contacts.forEach((contact) => {
    if (!contact.stayInTouch) return;
    if (contact.stayInTouch.snoozedUntil && contact.stayInTouch.snoozedUntil > today) return;
    const dueDate = contact.nextFollowUp ?? computeNextFollowUp(contact.lastContactedAt, contact.stayInTouch, contact.createdAt.slice(0, 10));
    if (!dueDate || dueDate > today) return;
    reminders.push({
      ...contact,
      nextFollowUp: dueDate,
      overdueDays: Math.max(0, diffDaysFromToday(dueDate)),
    });
  });

  return reminders.sort((left, right) => right.overdueDays - left.overdueDays || right.relationshipScore - left.relationshipScore);
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

export async function updateRolodexConnections(contactId: string, input: { add?: string[]; remove?: string[] }) {
  const contacts = await readRolodexFile();
  const index = contacts.findIndex((contact) => contact.id === contactId);
  if (index < 0) return null;

  const existingIds = new Set(contacts.map((contact) => contact.id));
  const add = normalizeConnections(input.add).filter((entry) => entry !== contactId && existingIds.has(entry));
  const remove = new Set(normalizeConnections(input.remove));
  const nextConnections = new Set(contacts[index].connections);

  add.forEach((entry) => {
    remove.delete(entry);
    nextConnections.add(entry);
  });
  remove.forEach((entry) => nextConnections.delete(entry));

  contacts[index] = applyPatch(contacts[index], { connections: Array.from(nextConnections) });

  contacts.forEach((contact, contactIndex) => {
    if (contact.id === contactId) return;
    const peerConnections = new Set(contact.connections);
    let changed = false;

    if (add.includes(contact.id) && !peerConnections.has(contactId)) {
      peerConnections.add(contactId);
      changed = true;
    }

    if (remove.has(contact.id) && peerConnections.has(contactId)) {
      peerConnections.delete(contactId);
      changed = true;
    }

    if (changed) {
      contacts[contactIndex] = applyPatch(contact, { connections: Array.from(peerConnections) });
    }
  });

  await writeRolodexFile(contacts);
  return contacts[index];
}

function seedNote(content: string, createdAt: string): RolodexNote {
  return {
    id: buildId("rn"),
    content,
    createdAt,
    updatedAt: createdAt,
  };
}

function seedInteraction(input: Omit<Interaction, "id" | "createdAt"> & { createdAt?: string }): Interaction {
  const createdAt = input.createdAt ?? new Date(`${input.date}T14:00:00.000Z`).toISOString();
  return {
    id: buildId("ri"),
    type: input.type,
    date: input.date,
    summary: input.summary,
    details: input.details,
    sentiment: input.sentiment,
    createdAt,
  };
}

function daysAgo(days: number) {
  return addDays(easternDate(), -days) ?? easternDate();
}

function seedContact(input: RolodexContactInput) {
  return createContactFromInput(input);
}

export async function seedRolodexContacts() {
  const existing = await readRolodexFile();
  if (existing.length > 0) {
    return { seeded: false, contacts: existing };
  }

  const seeded = [
    seedContact({
      firstName: "Marcus",
      lastName: "Thompson",
      email: "marcus@thompsonelectric.com",
      phone: "(502) 555-0101",
      company: "Thompson Electric LLC",
      title: "Owner",
      industry: "Electrical Services",
      website: "https://thompsonelectric.example.com",
      city: "Louisville",
      state: "KY",
      country: "USA",
      relationshipType: "client",
      tags: ["electrical", "home services", "louisville"],
      howWeMet: "Referred by a roofing client",
      metDate: daysAgo(84),
      birthday: "1985-06-14",
      spouse: "Dana",
      children: "2 boys",
      interests: "Fishing, bourbon trail weekends",
      favoriteFood: "Hot chicken",
      personalNotes: "Prefers calls before 8am. Expanding into commercial installs.",
      linkedin: "https://linkedin.com/in/marcus-thompson-electric",
      stayInTouch: { frequency: "monthly" },
      interactions: [
        seedInteraction({ type: "call", date: daysAgo(2), summary: "Reviewed office rewiring scope", details: "He wants pricing by Friday for the second floor.", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(8), summary: "Sent revised proposal", details: "Included alternate panel upgrade option.", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(13), summary: "Walkthrough at warehouse", details: "Met on site with facilities manager.", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(21), summary: "Confirmed permit status", sentiment: "neutral" }),
        seedInteraction({ type: "call", date: daysAgo(29), summary: "Inbound call about emergency job", details: "He replied quickly and approved overtime.", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(37), summary: "Shared invoice package", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(46), summary: "Lunch after referral", details: "Introduced a GC who may need estimating help.", sentiment: "positive" }),
        seedInteraction({ type: "referral", date: daysAgo(54), summary: "Introduced me to a general contractor", sentiment: "positive" }),
        seedInteraction({ type: "deal", date: daysAgo(61), summary: "Closed maintenance retainer", sentiment: "positive" }),
        seedInteraction({ type: "note", date: daysAgo(73), summary: "Mentioned daughter starts kindergarten this fall", sentiment: "neutral" }),
        seedInteraction({ type: "call", date: daysAgo(80), summary: "Initial intro call", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(88), summary: "Shared capabilities deck", sentiment: "neutral" }),
      ],
      notes: [
        seedNote("Send bourbon trail recommendations before his anniversary trip.", new Date(`${daysAgo(18)}T15:00:00.000Z`).toISOString()),
        seedNote("Strong referral source if commercial quote turnaround stays tight.", new Date(`${daysAgo(6)}T16:15:00.000Z`).toISOString()),
      ],
    }),
    seedContact({
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah@chenmarketing.com",
      phone: "(917) 555-0133",
      company: "Chen Marketing Group",
      title: "Founder",
      industry: "Marketing Consulting",
      website: "https://chenmarketing.example.com",
      city: "New York",
      state: "NY",
      country: "USA",
      relationshipType: "partner",
      tags: ["marketing", "agency", "partner"],
      howWeMet: "Met at a growth operators dinner",
      metDate: daysAgo(70),
      interests: "Pilates, coffee roasting",
      favoriteFood: "Dumplings",
      linkedin: "https://linkedin.com/in/sarah-chen-growth",
      twitter: "https://x.com/sarahchen",
      stayInTouch: { frequency: "biweekly" },
      interactions: [
        seedInteraction({ type: "email", date: daysAgo(5), summary: "Swapped landing page feedback", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(17), summary: "Joint partner strategy session", details: "Mapped Q2 webinar collaboration.", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(24), summary: "Discussed retainer referral structure", sentiment: "neutral" }),
        seedInteraction({ type: "email", date: daysAgo(31), summary: "She replied with intros to two SaaS founders", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(43), summary: "Confirmed NYC trip schedule", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(58), summary: "Coffee in SoHo", sentiment: "positive" }),
        seedInteraction({ type: "referral", date: daysAgo(64), summary: "Introduced me to a podcast producer", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(77), summary: "Initial follow-up from dinner", sentiment: "neutral" }),
      ],
      notes: [seedNote("Worth inviting into Louisville workshop series.", new Date(`${daysAgo(7)}T13:00:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "David",
      lastName: "Park",
      email: "david@parksitaliankitchen.com",
      phone: "(615) 555-0182",
      company: "Park's Italian Kitchen",
      title: "Owner",
      industry: "Restaurant",
      city: "Nashville",
      state: "TN",
      country: "USA",
      relationshipType: "prospect",
      tags: ["restaurant", "hospitality", "prospect"],
      howWeMet: "Inbound website lead",
      metDate: daysAgo(45),
      favoriteFood: "Espresso and cannoli",
      personalNotes: "Interested in loyalty campaigns but budget-sensitive.",
      stayInTouch: { frequency: "monthly" },
      interactions: [
        seedInteraction({ type: "call", date: daysAgo(6), summary: "Discovery call for spring promo support", sentiment: "neutral" }),
        seedInteraction({ type: "email", date: daysAgo(19), summary: "Sent sample campaign ideas", sentiment: "positive" }),
        seedInteraction({ type: "note", date: daysAgo(41), summary: "Scheduled initial call from website inquiry", sentiment: "neutral" }),
      ],
      notes: [seedNote("Follow up after March revenue review.", new Date(`${daysAgo(4)}T11:30:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily.rodriguez@example.com",
      phone: "(512) 555-0147",
      title: "Community Producer",
      city: "Austin",
      state: "TX",
      country: "USA",
      relationshipType: "friend",
      tags: ["sxsw", "community", "friend"],
      howWeMet: "Met at SXSW 2025",
      metDate: "2025-03-10",
      birthday: "1991-09-02",
      interests: "Live music, trail running, documentaries",
      favoriteFood: "Breakfast tacos",
      instagram: "https://instagram.com/emilyrodriguez",
      personalNotes: "Always knows the best community events in Austin.",
      stayInTouch: { frequency: "monthly" },
      interactions: [
        seedInteraction({ type: "text", date: daysAgo(1), summary: "Shared Austin recommendations for April trip", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(4), summary: "Catch-up call after conference season", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(9), summary: "Breakfast at Cosmic Coffee", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(14), summary: "She replied with venue list", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(20), summary: "Sent photos from SXSW panel", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(27), summary: "Met friends after showcase", sentiment: "positive" }),
        seedInteraction({ type: "gift", date: daysAgo(35), summary: "Mailed derby hat thank-you", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(43), summary: "Checked in after her half marathon", sentiment: "positive" }),
        seedInteraction({ type: "note", date: daysAgo(52), summary: "Mentioned planning a documentary club", sentiment: "neutral" }),
        seedInteraction({ type: "call", date: daysAgo(60), summary: "Booked SXSW meetup", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(68), summary: "Coffee during Austin work trip", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(74), summary: "Shared taco list", sentiment: "positive" }),
        seedInteraction({ type: "social", date: daysAgo(79), summary: "Commented on her event recap post", sentiment: "neutral" }),
        seedInteraction({ type: "email", date: daysAgo(83), summary: "Sent intros for a community role", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(89), summary: "SXSW 2025 intro meetup", sentiment: "positive" }),
      ],
      notes: [
        seedNote("Ask about documentary club and whether she still needs sponsors.", new Date(`${daysAgo(12)}T19:00:00.000Z`).toISOString()),
        seedNote("Potential connector for Austin founder dinners.", new Date(`${daysAgo(2)}T10:20:00.000Z`).toISOString()),
      ],
    }),
    seedContact({
      firstName: "James",
      lastName: "Wilson",
      email: "james@wilsondesign.co",
      company: "Wilson Design Co",
      title: "Lead Designer",
      industry: "Web Design",
      website: "https://wilsondesign.example.com",
      city: "Remote",
      country: "USA",
      relationshipType: "vendor",
      tags: ["design", "web", "contractor"],
      howWeMet: "Dribbble referral",
      metDate: daysAgo(95),
      interests: "Typography, cycling",
      personalNotes: "Fast turnaround, but prefers async feedback.",
      stayInTouch: { frequency: "quarterly" },
      interactions: [
        seedInteraction({ type: "email", date: daysAgo(11), summary: "Reviewed homepage revisions", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(22), summary: "Weekly design review", sentiment: "neutral" }),
        seedInteraction({ type: "deal", date: daysAgo(30), summary: "Approved sprint extension", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(44), summary: "Sent Figma link updates", sentiment: "neutral" }),
        seedInteraction({ type: "call", date: daysAgo(63), summary: "Project kickoff", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(86), summary: "Initial intro and portfolio review", sentiment: "neutral" }),
      ],
      notes: [seedNote("Could help with future dashboard reskins if availability opens up.", new Date(`${daysAgo(15)}T09:15:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "Mike",
      lastName: "O'Brien",
      email: "mike@obriengaragedoors.com",
      phone: "(502) 555-0171",
      company: "O'Brien Garage Doors",
      title: "Owner",
      industry: "Home Services",
      city: "Louisville",
      state: "KY",
      country: "USA",
      relationshipType: "client",
      tags: ["garage doors", "home services", "client"],
      howWeMet: "Introduced by Marcus Thompson",
      metDate: daysAgo(66),
      introducedBy: "Marcus Thompson",
      interests: "Golf, UK basketball",
      favoriteFood: "Steak",
      stayInTouch: { frequency: "monthly" },
      interactions: [
        seedInteraction({ type: "call", date: daysAgo(3), summary: "Campaign performance check-in", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(10), summary: "Sent March lead report", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(18), summary: "Quarterly planning session", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(26), summary: "Confirmed photo shoot time", sentiment: "neutral" }),
        seedInteraction({ type: "deal", date: daysAgo(33), summary: "Renewed service agreement", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(41), summary: "Inbound call about emergency ad spend", sentiment: "neutral" }),
        seedInteraction({ type: "email", date: daysAgo(50), summary: "Shared customer review highlights", sentiment: "positive" }),
        seedInteraction({ type: "referral", date: daysAgo(59), summary: "Introduced me to a fencing company owner", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(67), summary: "Lunch intro with Marcus", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(75), summary: "Discovery call", sentiment: "positive" }),
      ],
      notes: [seedNote("Strong case study candidate once spring install season closes.", new Date(`${daysAgo(8)}T14:45:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "Lisa",
      lastName: "Chang",
      email: "lisa@sequoiacapital.example.com",
      company: "Sequoia Capital",
      title: "Advisor",
      industry: "Venture Capital",
      website: "https://sequoiacapital.example.com",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      relationshipType: "mentor",
      tags: ["mentor", "investing", "advice"],
      howWeMet: "Introduced through founder office hours",
      metDate: daysAgo(102),
      interests: "Board games, hiking",
      linkedin: "https://linkedin.com/in/lisa-chang-advisor",
      stayInTouch: { frequency: "quarterly" },
      interactions: [
        seedInteraction({ type: "meeting", date: daysAgo(16), summary: "Monthly advising session", details: "Focused on pricing and hiring cadence.", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(28), summary: "She replied with hiring memo", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(49), summary: "Discussed board deck structure", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(71), summary: "Office hours follow-up", sentiment: "positive" }),
      ],
      notes: [seedNote("Ask her for feedback before the next strategic planning offsite.", new Date(`${daysAgo(13)}T12:10:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "Ahmed",
      lastName: "Hassan",
      email: "ahmed@hassanpainting.com",
      phone: "(859) 555-0124",
      company: "Hassan Painting Co",
      title: "Owner",
      industry: "Painting Contractor",
      city: "Lexington",
      state: "KY",
      country: "USA",
      relationshipType: "industry",
      tags: ["painting", "contractor", "industry"],
      howWeMet: "Met at contractor breakfast",
      metDate: daysAgo(58),
      interests: "Soccer, grilling",
      personalNotes: "Curious about local SEO and recruiting painters.",
      stayInTouch: { frequency: "monthly" },
      interactions: [
        seedInteraction({ type: "call", date: daysAgo(7), summary: "Talked through referral partnership", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(20), summary: "Contractor breakfast catch-up", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(34), summary: "Sent local SEO checklist", sentiment: "neutral" }),
        seedInteraction({ type: "text", date: daysAgo(47), summary: "Confirmed quote handoff", sentiment: "neutral" }),
        seedInteraction({ type: "note", date: daysAgo(57), summary: "Mentioned seasonal hiring pain", sentiment: "neutral" }),
      ],
      notes: [seedNote("Possible referral exchange with Marcus and Mike.", new Date(`${daysAgo(5)}T17:40:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "Rachel",
      lastName: "Kim",
      email: "rachel@derbydigital.com",
      phone: "(502) 555-0168",
      company: "Derby Digital",
      title: "Marketing Coordinator",
      industry: "Marketing",
      city: "Louisville",
      state: "KY",
      country: "USA",
      relationshipType: "team",
      tags: ["team", "operations", "marketing"],
      howWeMet: "Joined Derby Digital",
      metDate: daysAgo(180),
      birthday: "1996-11-19",
      interests: "Pilates, matcha, road trips",
      favoriteFood: "Sushi",
      personalNotes: "Keeps client onboarding running smoothly.",
      stayInTouch: { frequency: "weekly" },
      interactions: [
        seedInteraction({ type: "meeting", date: daysAgo(1), summary: "Daily standup", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(2), summary: "Shared launch checklist", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(4), summary: "Campaign review", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(6), summary: "Sent revised briefs", sentiment: "neutral" }),
        seedInteraction({ type: "call", date: daysAgo(9), summary: "Client prep on the way to site visit", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(12), summary: "Ops sync", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(16), summary: "Confirmed event logistics", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(21), summary: "Workshop retro", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(28), summary: "Shared pipeline export", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(32), summary: "Content planning", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(39), summary: "Handled client escalation", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(44), summary: "Training session", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(52), summary: "Checked in on event RSVPs", sentiment: "neutral" }),
        seedInteraction({ type: "email", date: daysAgo(60), summary: "Sent process notes", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(67), summary: "Weekly planning", sentiment: "positive" }),
        seedInteraction({ type: "text", date: daysAgo(73), summary: "Shared client gift ideas", sentiment: "positive" }),
        seedInteraction({ type: "meeting", date: daysAgo(79), summary: "Quarter kickoff", sentiment: "positive" }),
        seedInteraction({ type: "email", date: daysAgo(84), summary: "Built internal handoff doc", sentiment: "neutral" }),
        seedInteraction({ type: "meeting", date: daysAgo(87), summary: "Onboarding prep", sentiment: "positive" }),
        seedInteraction({ type: "call", date: daysAgo(90), summary: "First project sync", sentiment: "positive" }),
      ],
      notes: [seedNote("Candidate to own more client communication this quarter.", new Date(`${daysAgo(3)}T08:55:00.000Z`).toISOString())],
    }),
    seedContact({
      firstName: "George",
      lastName: "Papadopoulos",
      email: "george@athenagreekrestaurant.com",
      phone: "(419) 555-0196",
      company: "Athena Greek Restaurant",
      title: "Owner",
      industry: "Restaurant",
      city: "Mansfield",
      state: "OH",
      country: "USA",
      relationshipType: "prospect",
      tags: ["restaurant", "prospect", "ohio"],
      howWeMet: "Cold outreach reply",
      metDate: daysAgo(12),
      interests: "Local sports, grilling",
      stayInTouch: { frequency: "monthly" },
      interactions: [seedInteraction({ type: "call", date: daysAgo(2), summary: "Scheduled intro call for next week", details: "He asked for examples from other family restaurants.", sentiment: "neutral" })],
      notes: [seedNote("Very early stage. Bring localized examples and simple pricing.", new Date(`${daysAgo(1)}T18:20:00.000Z`).toISOString())],
    }),
  ].filter((entry): entry is RolodexContact => entry !== null);

  const byName = new Map(seeded.map((contact) => [`${contact.firstName} ${contact.lastName}`.trim(), contact.id]));
  const link = async (name: string, others: string[]) => {
    const id = byName.get(name);
    if (!id) return;
    const add = others.map((entry) => byName.get(entry)).filter((entry): entry is string => Boolean(entry));
    if (add.length) {
      const index = seeded.findIndex((contact) => contact.id === id);
      seeded[index] = applyPatch(seeded[index], { connections: Array.from(new Set([...seeded[index].connections, ...add])) });
    }
  };

  await link("Marcus Thompson", ["Mike O'Brien", "Ahmed Hassan"]);
  await link("Mike O'Brien", ["Marcus Thompson", "Rachel Kim"]);
  await link("Sarah Chen", ["Lisa Chang", "Rachel Kim"]);
  await link("Emily Rodriguez", ["Sarah Chen"]);
  await link("Ahmed Hassan", ["Marcus Thompson"]);
  await link("Rachel Kim", ["Sarah Chen", "Mike O'Brien"]);

  await writeRolodexFile(seeded);
  return { seeded: true, contacts: seeded };
}
