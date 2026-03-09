import { readPersistentData, writePersistentData } from "@/lib/persistence";
import { CALENDAR_TEAM_MEMBERS, CalendarEventRecord, CalendarEventType, INITIAL_CALENDAR_EVENTS } from "@/lib/calendar-schema";

const CALENDAR_FILE = "calendar.json";
const VALID_TYPES = new Set<CalendarEventType>(["deadline", "milestone", "meeting", "task"]);
const VALID_ASSIGNEES = new Set(CALENDAR_TEAM_MEMBERS.map((member) => member.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function normalizeTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  return null;
}

function normalizeType(value: unknown): CalendarEventType {
  if (typeof value === "string" && VALID_TYPES.has(value as CalendarEventType)) {
    return value as CalendarEventType;
  }
  return "task";
}

function normalizeAssignee(value: unknown): string {
  if (typeof value === "string" && VALID_ASSIGNEES.has(value)) return value;
  return "jahan";
}

function normalizeEvent(raw: unknown): CalendarEventRecord | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const client = typeof raw.client === "string" ? raw.client.trim() : "";
  if (!id || !title || !client) return null;

  return {
    id,
    title,
    date: normalizeDate(raw.date),
    time: normalizeTime(raw.time),
    assignee: normalizeAssignee(raw.assignee),
    type: normalizeType(raw.type),
    client,
  };
}

function normalizeCalendar(value: unknown): CalendarEventRecord[] {
  if (!Array.isArray(value)) return INITIAL_CALENDAR_EVENTS;
  const normalized = value.map(normalizeEvent).filter((event): event is CalendarEventRecord => event !== null);
  return normalized.length > 0 ? normalized : INITIAL_CALENDAR_EVENTS;
}

export async function getCalendarEvents(): Promise<CalendarEventRecord[]> {
  const raw = await readPersistentData<unknown>(CALENDAR_FILE, INITIAL_CALENDAR_EVENTS);
  const normalized = normalizeCalendar(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    await writeCalendarEvents(normalized);
  }
  return normalized;
}

export async function writeCalendarEvents(events: CalendarEventRecord[]) {
  await writePersistentData(CALENDAR_FILE, normalizeCalendar(events));
}
