import { NextResponse } from "next/server";
import { CalendarEventRecord, CalendarEventType } from "@/lib/calendar-schema";
import { getCalendarEvents, writeCalendarEvents } from "@/lib/calendar-store";

type UpdateCalendarEventInput = Partial<Omit<CalendarEventRecord, "id">>;

const VALID_TYPES: CalendarEventType[] = ["deadline", "milestone", "meeting", "task"];

function isType(value: unknown): value is CalendarEventType {
  return typeof value === "string" && VALID_TYPES.includes(value as CalendarEventType);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const patch = (await request.json()) as UpdateCalendarEventInput;
    const events = await getCalendarEvents();
    const index = events.findIndex((event) => event.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const current = events[index];
    const updated: CalendarEventRecord = {
      ...current,
      title: patch.title?.trim() ?? current.title,
      date: patch.date?.trim() ?? current.date,
      time: patch.time === undefined ? current.time : patch.time?.trim() || null,
      assignee: patch.assignee?.trim() ?? current.assignee,
      type: isType(patch.type) ? patch.type : current.type,
      client: patch.client?.trim() ?? current.client,
    };

    events[index] = updated;
    await writeCalendarEvents(events);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update event." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const events = await getCalendarEvents();
    const next = events.filter((event) => event.id !== id);

    if (next.length === events.length) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    await writeCalendarEvents(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete event." }, { status: 500 });
  }
}
