"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarEventRecord, CalendarEventType, CALENDAR_TEAM_MEMBERS } from "@/lib/calendar-schema";
import { ChevronLeft, ChevronRight, Clock3, Plus, Trash2, UserRound, X } from "lucide-react";

type EventForm = {
  title: string;
  date: string;
  time: string;
  assignee: string;
  type: CalendarEventType;
  client: string;
};

type FilterType = CalendarEventType | "all";

const TYPE_META: Record<CalendarEventType, { label: string; dot: string; badge: string; pill: string }> = {
  meeting: {
    label: "Meeting",
    dot: "bg-blue-400",
    badge: "border-blue-300/35 bg-blue-500/15 text-blue-100",
    pill: "border-blue-300/25 bg-blue-500/12 text-blue-100",
  },
  deadline: {
    label: "Deadline",
    dot: "bg-red-400",
    badge: "border-red-300/35 bg-red-500/15 text-red-100",
    pill: "border-red-300/25 bg-red-500/12 text-red-100",
  },
  task: {
    label: "Reminder",
    dot: "bg-amber-400",
    badge: "border-amber-300/35 bg-amber-500/15 text-amber-100",
    pill: "border-amber-300/25 bg-amber-500/12 text-amber-100",
  },
  milestone: {
    label: "Event",
    dot: "bg-emerald-400",
    badge: "border-emerald-300/35 bg-emerald-500/15 text-emerald-100",
    pill: "border-emerald-300/25 bg-emerald-500/12 text-emerald-100",
  },
};

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const DAY_TITLE_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const DAY_NUMBER_FORMAT = new Intl.DateTimeFormat("en-US", { day: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

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
const DAY_SEQUENCE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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
  const [detailOpen, setDetailOpen] = useState(false);

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
    selectedEventId ? selectedDayEvents.find((event) => event.id === selectedEventId) ?? null : selectedDayEvents[0] ?? null;

  function openDay(dateKey: string, nextMonth?: Date) {
    setSelectedDate(dateKey);
    setSelectedEventId(null);
    setDetailOpen(true);
    setIsEditing(false);
    if (nextMonth) setMonthDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1));
    setForm({
      title: "",
      date: dateKey,
      time: "",
      assignee: CALENDAR_TEAM_MEMBERS[0].id,
      type: "task",
      client: "Derby Digital",
    });
  }

  function jumpToToday() {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setMonthDate(firstOfMonth);
    setSelectedDate(TODAY_KEY);
    setSelectedEventId(null);
    setDetailOpen(true);
    resetCreateForm(TODAY_KEY);
  }

  function resetCreateForm(dateKey = selectedDate) {
    setIsEditing(false);
    setSelectedEventId(null);
    setForm({
      title: "",
      date: dateKey,
      time: "",
      assignee: CALENDAR_TEAM_MEMBERS[0].id,
      type: "task",
      client: "Derby Digital",
    });
  }

  function openCreateForm() {
    resetCreateForm(selectedDate);
    setDetailOpen(true);
  }

  function openEditForm(event: CalendarEventRecord) {
    setIsEditing(true);
    setSelectedDate(event.date);
    setSelectedEventId(event.id);
    setDetailOpen(true);
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

      const savedDate = parseDateKey(saved.date);
      setSelectedDate(saved.date);
      setSelectedEventId(saved.id);
      setMonthDate(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1));
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
      setError(null);
      resetCreateForm(selectedDate);
    } catch {
      setError("Could not delete event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Scheduling</p>
            <h1 className="page-title mt-2">Calendar</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Monthly scheduling for client deadlines, team meetings, reminders, and delivery milestones.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="glass-card inline-flex items-center gap-2 rounded-2xl px-2 py-2">
              <button
                type="button"
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-slate-100 transition hover:border-blue-300/45 hover:bg-blue-500/15"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-[10rem] px-2 text-center text-sm font-semibold uppercase tracking-[0.12em] text-blue-50">
                {MONTH_FORMAT.format(monthDate)}
              </div>
              <button
                type="button"
                onClick={() => setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-slate-100 transition hover:border-blue-300/45 hover:bg-blue-500/15"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
            >
              <Plus size={16} />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="glass-panel p-4 sm:p-5">
          <div className="mb-4 grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
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
              className="min-h-11 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
            >
              <option value="all">All event types</option>
              <option value="meeting">Meetings</option>
              <option value="deadline">Deadlines</option>
              <option value="task">Reminders</option>
              <option value="milestone">Events</option>
            </select>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2.5 text-xs text-slate-300">
              {(["meeting", "deadline", "task", "milestone"] as CalendarEventType[]).map((type) => (
                <span key={type} className="inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${TYPE_META[type].dot}`} />
                  {TYPE_META[type].label}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={jumpToToday}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/25"
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {DAY_SEQUENCE.map((day) => (
              <div key={day} className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-10 text-sm text-slate-300">Loading calendar...</div>
          ) : (
            <div className="mt-3 grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const dayKey = dateToKey(day);
                const dayEvents = eventsByDate.get(dayKey) ?? [];
                const isToday = dayKey === TODAY_KEY;
                const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                const isSelected = dayKey === selectedDate;

                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => openDay(dayKey, day)}
                    className={`min-h-[8.5rem] rounded-2xl border p-2.5 text-left transition sm:min-h-[9.75rem] ${
                      isSelected
                        ? "border-blue-300/50 bg-[linear-gradient(180deg,rgba(32,147,255,0.16),rgba(8,14,30,0.78))] shadow-[0_0_28px_rgba(32,147,255,0.18)]"
                        : "border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.86),rgba(5,8,18,0.7))] hover:border-blue-300/30 hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                          isToday
                            ? "ring-2 ring-blue-300 bg-blue-500/20 text-white shadow-[0_0_18px_rgba(32,147,255,0.28)]"
                            : isCurrentMonth
                              ? "text-slate-100"
                              : "text-slate-500"
                        }`}
                      >
                        {DAY_NUMBER_FORMAT.format(day)}
                      </span>
                      {dayEvents.length ? <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{dayEvents.length}</span> : null}
                    </div>

                    <div className="mt-3 hidden space-y-1.5 sm:block">
                      {dayEvents.slice(0, 3).map((calendarEvent) => (
                        <div
                          key={calendarEvent.id}
                          className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2 py-1 text-[11px] ${TYPE_META[calendarEvent.type].pill}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${TYPE_META[calendarEvent.type].dot}`} />
                          <span className="truncate">{calendarEvent.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 ? <p className="text-[11px] text-slate-500">+{dayEvents.length - 3} more</p> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1 sm:hidden">
                      {dayEvents.slice(0, 4).map((calendarEvent) => (
                        <span key={calendarEvent.id} className={`h-2.5 w-2.5 rounded-full ${TYPE_META[calendarEvent.type].dot}`} />
                      ))}
                      {dayEvents.length > 4 ? <span className="text-[11px] text-slate-500">+{dayEvents.length - 4}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 xl:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Selected day</p>
                <h2 className="mt-2 text-base font-semibold text-white">{DAY_TITLE_FORMAT.format(parseDateKey(selectedDate))}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-500/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100 transition hover:border-blue-300/55 hover:bg-blue-500/20"
              >
                Open Panel
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-400">No events scheduled.</div>
              ) : (
                selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEditForm(event)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition hover:border-blue-300/35 hover:bg-slate-900/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="mt-1 text-sm text-slate-300">{event.client}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${TYPE_META[event.type].badge}`}>
                        {TYPE_META[event.type].label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} />
                        {formatTime(event.time)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound size={13} />
                        {assigneeName(event.assignee)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="glass-panel hidden p-4 xl:block">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Selected day</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{DAY_TITLE_FORMAT.format(parseDateKey(selectedDate))}</h2>
          <p className="mt-2 text-sm text-slate-400">{selectedDayEvents.length} event{selectedDayEvents.length === 1 ? "" : "s"} visible</p>

          <div className="mt-5 space-y-3">
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-400">Select a day or add a new event.</div>
            ) : (
              selectedDayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEditForm(event)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedEvent?.id === event.id ? "border-blue-300/45 bg-blue-500/12" : "border-white/10 bg-slate-950/40 hover:border-blue-300/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{event.title}</p>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${TYPE_META[event.type].badge}`}>
                      {TYPE_META[event.type].label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} />
                      {formatTime(event.time)}
                    </span>
                    <span>{event.client}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <div className={`fixed inset-0 z-40 transition ${detailOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!detailOpen}>
        <button
          type="button"
          onClick={() => setDetailOpen(false)}
          className={`absolute inset-0 bg-[#05070f]/72 backdrop-blur-sm transition ${detailOpen ? "opacity-100" : "opacity-0"}`}
        />

        <aside
          className={`absolute inset-y-0 right-0 flex w-full max-w-[28rem] flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(9,12,22,0.98),rgba(6,8,16,0.98))] p-5 shadow-[-24px_0_60px_rgba(0,0,0,0.45)] transition duration-300 sm:p-6 ${
            detailOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Day Details</p>
              <h2 className="mt-2 heading-font text-3xl font-normal uppercase tracking-[0.03em] text-white">
                {DAY_TITLE_FORMAT.format(parseDateKey(selectedDate))}
              </h2>
              <p className="mt-2 text-sm text-slate-400">{selectedDayEvents.length} scheduled event{selectedDayEvents.length === 1 ? "" : "s"}</p>
            </div>

            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-blue-300/40 hover:bg-blue-500/15"
              aria-label="Close details panel"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Events</p>
                <button
                  type="button"
                  onClick={() => resetCreateForm(selectedDate)}
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100 transition hover:text-white"
                >
                  New event
                </button>
              </div>

              <div className="space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 text-sm text-slate-400">No events scheduled for this day.</div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEditForm(event)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedEvent?.id === event.id ? "border-blue-300/45 bg-blue-500/12" : "border-white/10 bg-slate-950/40 hover:border-blue-300/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{event.title}</p>
                          <p className="mt-1 text-sm text-slate-300">{event.client}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${TYPE_META[event.type].badge}`}>
                          {TYPE_META[event.type].label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={13} />
                          {formatTime(event.time)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound size={13} />
                          {assigneeName(event.assignee)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{isEditing ? "Edit event" : "Add event"}</p>
                  <p className="mt-1 text-sm text-slate-300">{isEditing ? "Update or remove the selected event." : "Create a new event for the selected day."}</p>
                </div>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-300/35 bg-red-500/12 px-3 text-sm font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-500/22 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                ) : null}
              </div>

              <form onSubmit={submitForm} className="mt-4 space-y-3">
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Event title"
                  className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/60"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
                  />
                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={form.assignee}
                    onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
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
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="task">Reminder</option>
                    <option value="milestone">Event</option>
                  </select>
                </div>

                <input
                  value={form.client}
                  onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
                  placeholder="Client"
                  className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400/60"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.22),rgba(0,38,255,0.22))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={15} />
                  {isEditing ? "Save Changes" : "Create Event"}
                </button>
              </form>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
