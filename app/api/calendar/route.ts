import { NextResponse } from "next/server";
import { CalendarEventRecord, CalendarEventType } from "@/lib/calendar-schema";
import { getCalendarEvents, writeCalendarEvents } from "@/lib/calendar-store";

type CreateCalendarEventInput = Partial<Omit<CalendarEventRecord, "id">>;

const VALID_TYPES: CalendarEventType[] = ["deadline", "milestone", "meeting", "task"];

function buildEventId() {
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function isType(value: unknown): value is CalendarEventType {
  return typeof value === "string" && VALID_TYPES.includes(value as CalendarEventType);
}

export async function GET() {
  return NextResponse.json(getCalendarEvents());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCalendarEventInput;
    const title = body.title?.trim();
    const client = body.client?.trim();
    const date = body.date?.trim();

    if (!title || !client || !date) {
      return NextResponse.json({ error: "Title, date, and client are required." }, { status: 400 });
    }

    const event: CalendarEventRecord = {
      id: buildEventId(),
      title,
      date,
      time: body.time?.trim() || null,
      assignee: body.assignee?.trim() || "jahan",
      type: isType(body.type) ? body.type : "task",
      client,
    };

    const events = getCalendarEvents();
    events.push(event);
    writeCalendarEvents(events);

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create event." }, { status: 500 });
  }
}
