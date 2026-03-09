"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarEventRecord, CalendarEventType, CALENDAR_TEAM_MEMBERS } from "@/lib/calendar-schema";
import { ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from "lucide-react";

type EventForm = {
  title: string;
  date: string;
  time: string;
  assignee: string;
  type: CalendarEventType;
  client: string;
};

type FilterType = CalendarEventType | "all";

const TYPE_COLORS: Record<CalendarEventType, string> = {
  deadline: "border-red-300/50 bg-red-500/20 text-red-100",
  milestone: "border-blue-300/50 bg-blue-500/20 text-blue-100",
  meeting: "border-emerald-300/50 bg-emerald-500/20 text-emerald-100",
  task: "border-slate-300/40 bg-slate-500/20 text-slate-100",
};

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_TITLE_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatTime(value: string | null): string {
  if (!value) return "All day";
  const [hour, minute] = value.split(":").map(Number);
  return TIME_FORMAT.format(new Date(2026, 0, 1, hour, minute));
}

function assigneeName(id: string): string {
  return CALENDAR_TEAM_MEMBERS.find((member) => member.id === id)?.name ?? id;
}

function buildMonthGrid(monthDate: Date): Date[] {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const TODAY_KEY = dateToKey(new Date());

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EventForm>({
    title: "",
    date: TODAY_KEY,
    time: "",
    assignee: CALENDAR_TEAM_MEMBERS[0].id,
    type: "task",
    client: "Derby Digital",
  });

  useEffect(() => {
    void loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const response = await fetch("/api/calendar", { cache: "no-store" });
      if (!response.ok) throw new Error("Load failed");
      const data = (await response.json()) as CalendarEventRecord[];
      setEvents(data);
      setError(null);
    } catch {
      setError("Could not load calendar events.");
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (assigneeFilter !== "all" && event.assignee !== assigneeFilter) return false;
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      return true;
    });
  }, [assigneeFilter, events, typeFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventRecord[]>();
    for (const event of filteredEvents) {
      const current = map.get(event.date) ?? [];
      current.push(event);
      map.set(event.date, current);
    }
    for (const [key, value] of map.entries()) {
      value.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
      map.set(key, value);
    }
    return map;
  }, [filteredEvents]);

  const monthDays = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedEvent =
    selectedEventId ? selectedDayEvents.find((event) => event.id === selectedEventId) ?? null : null;

  function jumpToToday() {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(TODAY_KEY);
    setSelectedEventId(null);
  }

  function openCreateForm() {
    setIsEditing(false);
    setSelectedEventId(null);
    setForm({
      title: "",
      date: selectedDate,
      time: "",
      assignee: CALENDAR_TEAM_MEMBERS[0].id,
      type: "task",
      client: "Derby Digital",
    });
  }

  function openEditForm(event: CalendarEventRecord) {
    setIsEditing(true);
    setSelectedEventId(event.id);
    setForm({
      title: event.title,
      date: event.date,
      time: event.time ?? "",
      assignee: event.assignee,
      type: event.type,
      client: event.client,
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.client.trim() || !form.date) {
      setError("Title, date, and client are required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        date: form.date,
        time: form.time || null,
        assignee: form.assignee,
        type: form.type,
        client: form.client.trim(),
      };

      const response = await fetch(isEditing && selectedEventId ? `/api/calendar/${selectedEventId}` : "/api/calendar", {
        method: isEditing && selectedEventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Save failed");
      const saved = (await response.json()) as CalendarEventRecord;

      if (isEditing) {
        setEvents((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        setEvents((prev) => [...prev, saved]);
      }

      setSelectedDate(saved.date);
      setSelectedEventId(saved.id);
      openEditForm(saved);
      setError(null);
    } catch {
      setError("Could not save event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedEventId) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/calendar/${selectedEventId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setEvents((prev) => prev.filter((event) => event.id !== selectedEventId));
      setSelectedEventId(null);
      openCreateForm();
      setError(null);
    } catch {
      setError("Could not delete event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="animate-enter space-y-5" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="mt-2 text-sm text-slate-300">Team scheduling and event tracking.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
          >
            <option value="all">All assignees</option>
            {CALENDAR_TEAM_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as FilterType)}
            className="rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
          >
            <option value="all">All types</option>
            <option value="deadline">Deadline</option>
            <option value="milestone">Milestone</option>
            <option value="meeting">Meeting</option>
            <option value="task">Task</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(18rem,1fr)]">
        <div className="glass-panel p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-100 transition hover:border-blue-300/50 hover:bg-blue-500/20"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-100 transition hover:border-blue-300/50 hover:bg-blue-500/20"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={jumpToToday}
                className="rounded-lg border border-blue-300/30 bg-blue-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
              >
                Today
              </button>
            </div>
            <p className="text-lg font-semibold tracking-tight text-blue-50">{MONTH_FORMAT.format(monthDate)}</p>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2">
            {DAY_LABELS.map((day) => (
              <div key={day} className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/35 px-4 py-8 text-sm text-slate-300">Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const dayKey = dateToKey(day);
                const dayEvents = eventsByDate.get(dayKey) ?? [];
                const isToday = dayKey === TODAY_KEY;
                const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                const isSelected = dayKey === selectedDate;

                return (
                  <div
                    key={dayKey}
                    onClick={() => {
                      setSelectedDate(dayKey);
                      setSelectedEventId(null);
                    }}
                    className={`group min-h-[108px] cursor-pointer rounded-xl border p-2 text-left transition md:min-h-[124px] ${
                      isSelected
                        ? "border-blue-300/70 bg-blue-500/20 shadow-[0_0_24px_rgba(32,147,255,0.22)]"
                        : "border-white/10 bg-slate-950/35 hover:border-blue-200/35 hover:bg-slate-900/55"
                    } ${isToday ? "ring-1 ring-blue-400/80 shadow-[0_0_18px_rgba(32,147,255,0.38)]" : ""}`}
                  >
                    <div className={`mb-2 text-xs font-semibold ${isCurrentMonth ? "text-slate-100" : "text-slate-500"}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((calendarEvent) => (
                        <button
                          key={calendarEvent.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDate(dayKey);
                            setSelectedEventId(calendarEvent.id);
                            openEditForm(calendarEvent);
                          }}
                          className={`block w-full truncate rounded-md border px-2 py-1 text-left text-[11px] font-medium ${TYPE_COLORS[calendarEvent.type]}`}
                          title={calendarEvent.title}
                        >
                          {calendarEvent.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 ? (
                        <p className="px-1 text-[11px] text-slate-400">+{dayEvents.length - 3} more</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="glass-panel p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Selected Day</p>
              <h2 className="mt-1 text-base font-semibold text-blue-50">{DAY_TITLE_FORMAT.format(parseDateKey(selectedDate))}</h2>
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300/30 bg-blue-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
            >
              <Plus size={14} />
              Add Event
            </button>
          </div>

          <div className="mb-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-3 text-sm text-slate-400">
                No events for this day.
              </div>
            ) : (
              selectedDayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(event.id);
                    openEditForm(event);
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedEventId === event.id ? "border-blue-300/60 bg-blue-500/20" : "border-white/10 bg-slate-950/45 hover:border-blue-200/35"} `}
                >
                  <p className="truncate text-sm font-semibold text-slate-100">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {event.client} • {assigneeName(event.assignee)}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                    <Clock3 size={12} />
                    {formatTime(event.time)}
                  </p>
                </button>
              ))
            )}
          </div>

          {selectedEvent ? (
            <div className="mb-4 rounded-xl border border-blue-300/35 bg-blue-500/15 p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-blue-100/80">Event Details</p>
              <p className="mt-2 text-sm font-semibold text-blue-50">{selectedEvent.title}</p>
              <p className="mt-1 text-xs text-blue-100/90">{selectedEvent.client}</p>
              <p className="mt-1 text-xs text-blue-100/90">
                {selectedEvent.type} • {assigneeName(selectedEvent.assignee)} • {formatTime(selectedEvent.time)}
              </p>
            </div>
          ) : null}

          <form onSubmit={submitForm} className="space-y-3">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Event title"
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/60"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              />
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={form.assignee}
                onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                {CALENDAR_TEAM_MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CalendarEventType }))}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                <option value="deadline">Deadline</option>
                <option value="milestone">Milestone</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>
            </div>

            <input
              value={form.client}
              onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
              placeholder="Client"
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/60"
            />

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl border border-blue-300/35 bg-blue-500/25 px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:bg-blue-500/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditing ? "Save Changes" : "Create Event"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : null}
            </div>
          </form>
        </aside>
      </div>
    </section>
  );
}
