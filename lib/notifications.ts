import { getPipelineActivity } from "@/lib/pipeline-activity";
import { getPipelineDeals } from "@/lib/pipeline-store";
import { readPersistentData, writePersistentData } from "@/lib/persistence";
import { getRolodexContacts } from "@/lib/rolodex-store";

const NOTIFICATIONS_FILE = "notifications.json";
const EASTERN_TIME_ZONE = "America/New_York";
const COLD_CONTACT_DAYS = 30;
const MAX_NOTIFICATIONS = 100;

export type MissionNotificationType = "pipeline" | "rolodex";

export type MissionNotification = {
  id: string;
  title: string;
  timestamp: string;
  type: MissionNotificationType;
  read: boolean;
};

type NotificationState = {
  read: Record<string, string>;
};

function normalizeState(value: unknown): NotificationState {
  if (!value || typeof value !== "object") {
    return { read: {} };
  }

  const raw = value as { read?: unknown };
  const read = raw.read;
  if (!read || typeof read !== "object") {
    return { read: {} };
  }

  const entries = Object.entries(read as Record<string, unknown>).filter(([, timestamp]) => typeof timestamp === "string" && timestamp.trim());
  return { read: Object.fromEntries(entries) };
}

function easternDateOnly(value = new Date()) {
  return value.toLocaleDateString("en-CA", { timeZone: EASTERN_TIME_ZONE });
}

function formatMonthDay(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: EASTERN_TIME_ZONE,
  }).format(value);
}

function parseIsoDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function easternDayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function diffEasternDays(from: string, to = easternDateOnly()) {
  return easternDayIndex(to) - easternDayIndex(from);
}

function fullName(input: { firstName?: string; lastName?: string }) {
  return [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
}

function nextBirthdayOccurrence(birthday?: string) {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;

  const today = parseIsoDate(easternDateOnly());
  if (!today) return null;

  const monthDay = birthday.slice(5);
  let occurrence = parseIsoDate(`${today.getUTCFullYear()}-${monthDay}`);
  if (!occurrence) return null;

  if (occurrence.getTime() < today.getTime()) {
    occurrence = parseIsoDate(`${today.getUTCFullYear() + 1}-${monthDay}`);
  }

  return occurrence;
}

async function readNotificationState() {
  return normalizeState(await readPersistentData<unknown>(NOTIFICATIONS_FILE, { read: {} }));
}

async function writeNotificationState(state: NotificationState) {
  await writePersistentData(NOTIFICATIONS_FILE, state);
}

function withReadState(notifications: Omit<MissionNotification, "read">[], state: NotificationState): MissionNotification[] {
  return notifications
    .map((notification) => ({
      ...notification,
      read: Boolean(state.read[notification.id]),
    }))
    .sort((left, right) => {
      const timeDelta = Date.parse(right.timestamp) - Date.parse(left.timestamp);
      if (timeDelta !== 0) return timeDelta;
      return left.id.localeCompare(right.id);
    })
    .slice(0, MAX_NOTIFICATIONS);
}

function dedupeNotifications(notifications: Omit<MissionNotification, "read">[]) {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    if (seen.has(notification.id)) return false;
    seen.add(notification.id);
    return true;
  });
}

async function buildNotifications() {
  const today = easternDateOnly();
  const [pipelineDeals, pipelineActivity, contacts] = await Promise.all([
    getPipelineDeals(),
    getPipelineActivity(100),
    getRolodexContacts(),
  ]);

  const notifications: Omit<MissionNotification, "read">[] = [];

  pipelineDeals
    .filter((deal) => deal.createdAt === today)
    .forEach((deal) => {
      notifications.push({
        id: `pipeline:new-lead:${deal.id}:${deal.createdAt}`,
        title: `New lead added today: ${deal.name || deal.contact || deal.client}`,
        timestamp: new Date(`${deal.createdAt}T12:00:00.000Z`).toISOString(),
        type: "pipeline",
      });
    });

  pipelineActivity
    .filter((entry) => entry.type === "stage-change")
    .forEach((entry) => {
      notifications.push({
        id: `pipeline:stage-change:${entry.id}`,
        title: entry.message,
        timestamp: entry.timestamp,
        type: "pipeline",
      });
    });

  contacts
    .filter((contact) => contact.createdAt.slice(0, 10) === today)
    .forEach((contact) => {
      notifications.push({
        id: `rolodex:new-contact:${contact.id}:${contact.createdAt.slice(0, 10)}`,
        title: `New contact added today: ${fullName(contact) || contact.company || "Untitled contact"}`,
        timestamp: contact.createdAt,
        type: "rolodex",
      });
    });

  contacts
    .filter((contact) => contact.nextFollowUp && contact.nextFollowUp <= today)
    .forEach((contact) => {
      const dueDate = contact.nextFollowUp!;
      notifications.push({
        id: `rolodex:follow-up:${contact.id}:${dueDate}`,
        title: `Follow-up overdue: ${fullName(contact) || contact.company || "Untitled contact"}`,
        timestamp: new Date(`${dueDate}T12:00:00.000Z`).toISOString(),
        type: "rolodex",
      });
    });

  contacts.forEach((contact) => {
    const birthday = nextBirthdayOccurrence(contact.birthday);
    if (!birthday) return;

    const daysAway = diffEasternDays(today, easternDateOnly(birthday));
    if (daysAway < 0 || daysAway > 7) return;

    notifications.push({
      id: `rolodex:birthday:${contact.id}:${birthday.toISOString().slice(0, 10)}`,
      title: `${fullName(contact) || contact.company || "A contact"} has a birthday on ${formatMonthDay(birthday)}`,
      timestamp: birthday.toISOString(),
      type: "rolodex",
    });
  });

  contacts
    .filter((contact) => {
      if (!contact.lastContactedAt) return false;
      return diffEasternDays(contact.lastContactedAt, today) >= COLD_CONTACT_DAYS;
    })
    .forEach((contact) => {
      notifications.push({
        id: `rolodex:going-cold:${contact.id}:${contact.lastContactedAt}`,
        title: `${fullName(contact) || contact.company || "A contact"} is going cold`,
        timestamp: new Date(`${contact.lastContactedAt}T12:00:00.000Z`).toISOString(),
        type: "rolodex",
      });
    });

  return dedupeNotifications(notifications);
}

export async function getNotifications() {
  const [state, generated] = await Promise.all([readNotificationState(), buildNotifications()]);
  const notifications = withReadState(generated, state);
  const activeIds = new Set(notifications.map((notification) => notification.id));
  const nextState = {
    read: Object.fromEntries(Object.entries(state.read).filter(([id]) => activeIds.has(id))),
  };

  if (Object.keys(nextState.read).length !== Object.keys(state.read).length) {
    await writeNotificationState(nextState);
  }

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
  };
}

export async function markNotificationsRead(input: { ids?: string[]; all?: boolean }) {
  const state = await readNotificationState();
  const generated = await buildNotifications();
  const activeIds = new Set(generated.map((notification) => notification.id));
  const idsToMark = input.all ? Array.from(activeIds) : (input.ids ?? []).filter((id) => activeIds.has(id));

  if (!idsToMark.length) {
    return getNotifications();
  }

  state.read = Object.fromEntries(Object.entries(state.read).filter(([id]) => activeIds.has(id)));
  const readAt = new Date().toISOString();
  idsToMark.forEach((id) => {
    state.read[id] = readAt;
  });
  await writeNotificationState(state);
  return getNotifications();
}
