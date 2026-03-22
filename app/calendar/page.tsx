"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Filter,
  Loader2, Plus, RefreshCw, Repeat, Trash2, User, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface CalEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  assignee: string;
  type: string;
  client: string | null;
  description: string | null;
  recurring: string | null;
  cron_id: string | null;
  created_by: string | null;
  created_at: string;
}

type ViewMode = "month" | "week" | "day";

/* ── Constants ── */
const AGENTS: Record<string, { name: string; color: string }> = {
  kimberly: { name: "Kimberly", color: "#2093FF" },
  kevin: { name: "Kevin", color: "#FFBD59" },
  alex: { name: "Alex", color: "#F93C3C" },
  sabri: { name: "Sabri", color: "#FF6B35" },
  jordan: { name: "Jordan", color: "#22C55E" },
  jahan: { name: "Jahan", color: "#A855F7" },
  hamza: { name: "Hamza", color: "#EC4899" },
  abdul: { name: "Abdul", color: "#14B8A6" },
  elang: { name: "Elang", color: "#8B5CF6" },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  meeting: { label: "Meeting", color: "#2093FF", emoji: "📞" },
  deadline: { label: "Deadline", color: "#F93C3C", emoji: "🔴" },
  task: { label: "Task", color: "#FFBD59", emoji: "⚡" },
  milestone: { label: "Milestone", color: "#22C55E", emoji: "🏆" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ── Add Event Modal ── */
function AddEventModal({ defaultDate, onClose, onAdd }: { defaultDate?: string; onClose: () => void; onAdd: (e: Partial<CalEvent>) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || dateKey(new Date()));
  const [time, setTime] = useState("");
  const [assignee, setAssignee] = useState("kimberly");
  const [type, setType] = useState("task");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#12121a] border border-white/10 rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Event</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:border-[#2093FF]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Assignee</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
                {Object.entries(AGENTS).map(([id, a]) => <option key={id} value={id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
                {Object.entries(TYPE_CONFIG).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Client</label>
              <input value={client} onChange={e => setClient(e.target.value)} placeholder="Optional"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button disabled={!title.trim() || !date}
            onClick={() => { onAdd({ title, date, time: time || null, assignee, type, client: client || null, description: description || null, created_by: "jahan" }); onClose(); }}
            className="px-4 py-2 bg-[#2093FF] text-white text-sm font-medium rounded-lg hover:brightness-110 disabled:opacity-30">
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Event Detail Drawer ── */
function EventDetail({ event, onClose, onDelete }: { event: CalEvent; onClose: () => void; onDelete: (id: string) => void }) {
  const agent = AGENTS[event.assignee] || { name: event.assignee, color: "#64748b" };
  const typeConf = TYPE_CONFIG[event.type] || TYPE_CONFIG.task;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#12121a] border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span>{typeConf.emoji}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${typeConf.color}20`, color: typeConf.color }}>{typeConf.label}</span>
              {event.recurring && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 flex items-center gap-1"><Repeat className="w-2.5 h-2.5" />{event.recurring}</span>}
            </div>
            <h3 className="text-lg font-semibold">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-300">
              {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {event.time && ` at ${fmtTime(event.time)}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium" style={{ color: agent.color }}>{agent.name}</span>
          </div>
          {event.client && (
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 text-center text-slate-500 text-xs">🏢</span>
              <span className="text-sm text-slate-300">{event.client}</span>
            </div>
          )}
          {event.description && (
            <p className="text-sm text-slate-400 bg-white/[0.03] border border-white/5 rounded-lg p-3">{event.description}</p>
          )}
          {event.cron_id && (
            <div className="text-[10px] text-slate-600 font-mono">Cron: {event.cron_id}</div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          {!event.cron_id && (
            <button onClick={() => { if (confirm("Delete this event?")) { onDelete(event.id); onClose(); } }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Calendar Page ── */
export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<string | undefined>();
  const [filterAgent, setFilterAgent] = useState("all");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleAdd = async (eventData: Partial<CalEvent>) => {
    try {
      await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventData) });
      fetchEvents();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try { await fetch(`/api/calendar?id=${id}`, { method: "DELETE" }); } catch { fetchEvents(); }
  };

  const filtered = useMemo(() => {
    if (filterAgent === "all") return events;
    return events.filter(e => e.assignee === filterAgent);
  }, [events, filterAgent]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    filtered.forEach(e => { (map[e.date] ??= []).push(e); });
    return map;
  }, [filtered]);

  // Month view helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = dateKey(new Date());

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDay, daysInMonth]);

  // Week view helpers
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const nav = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#2093FF]" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-slate-500 text-sm mt-1">{events.length} events · {events.filter(e => e.recurring).length} recurring</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchEvents} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setAddDate(undefined); setShowAdd(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2093FF] text-white text-sm font-medium rounded-lg hover:brightness-110">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* Nav + View Toggle + Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {view === "month" && `${MONTHS[month]} ${year}`}
            {view === "week" && `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            {view === "day" && currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h2>
          <button onClick={() => nav(1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-slate-400">Today</button>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
            <option value="all">All Agents</option>
            {Object.entries(AGENTS).map(([id, a]) => <option key={id} value={id}>{a.name}</option>)}
          </select>
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(["month", "week", "day"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium capitalize", view === v ? "bg-[#2093FF] text-white" : "text-slate-400")}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="p-3 text-center text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dk = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const dayEvents = dk ? (eventsByDate[dk] || []) : [];
              const isToday = dk === today;

              return (
                <div key={i}
                  className={cn("min-h-[100px] p-2 border-b border-r border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer",
                    !day && "bg-white/[0.01]")}
                  onClick={() => { if (day) { setAddDate(dk); setShowAdd(true); } }}>
                  {day && (
                    <>
                      <span className={cn("text-xs font-mono inline-flex items-center justify-center w-6 h-6 rounded-full",
                        isToday ? "bg-[#2093FF] text-white font-bold" : "text-slate-500")}>{day}</span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => {
                          const agent = AGENTS[ev.assignee];
                          return (
                            <div key={ev.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate hover:brightness-125 transition-all"
                              style={{ background: `${agent?.color || "#64748b"}15`, color: agent?.color || "#94a3b8" }}>
                              {ev.recurring && <Repeat className="w-2 h-2 flex-shrink-0" />}
                              <span className="truncate">{ev.time ? fmtTime(ev.time) + " " : ""}{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-slate-600 pl-1">+{dayEvents.length - 3} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map(d => {
              const dk = dateKey(d);
              const isToday = dk === today;
              const dayEvents = eventsByDate[dk] || [];
              return (
                <div key={dk} className={cn("border-r border-white/[0.04] min-h-[400px]", isToday && "bg-[#2093FF]/5")}>
                  <div className={cn("p-3 text-center border-b border-white/5", isToday && "bg-[#2093FF]/10")}>
                    <div className="text-[10px] text-slate-500 uppercase">{DAYS[d.getDay()]}</div>
                    <div className={cn("text-lg font-mono", isToday ? "text-[#2093FF] font-bold" : "text-slate-300")}>{d.getDate()}</div>
                  </div>
                  <div className="p-2 space-y-1">
                    {dayEvents.map(ev => {
                      const agent = AGENTS[ev.assignee];
                      return (
                        <div key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2 py-1.5 rounded-lg text-[11px] cursor-pointer hover:brightness-125 transition-all"
                          style={{ background: `${agent?.color || "#64748b"}12`, borderLeft: `2px solid ${agent?.color || "#64748b"}` }}>
                          {ev.time && <div className="text-[9px] text-slate-500 mb-0.5">{fmtTime(ev.time)}</div>}
                          <div className="font-medium truncate" style={{ color: agent?.color }}>{ev.title}</div>
                          {ev.recurring && <span className="text-[8px] text-purple-400 flex items-center gap-0.5 mt-0.5"><Repeat className="w-2 h-2" />{ev.recurring}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-3">
          {(eventsByDate[dateKey(currentDate)] || []).length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">No events scheduled</p>
              <button onClick={() => { setAddDate(dateKey(currentDate)); setShowAdd(true); }}
                className="mt-3 px-4 py-2 text-sm text-[#2093FF] hover:bg-[#2093FF]/10 rounded-lg">+ Add Event</button>
            </div>
          ) : (
            (eventsByDate[dateKey(currentDate)] || []).map(ev => {
              const agent = AGENTS[ev.assignee];
              const typeConf = TYPE_CONFIG[ev.type] || TYPE_CONFIG.task;
              return (
                <div key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] cursor-pointer transition-all"
                  style={{ borderLeftWidth: 3, borderLeftColor: agent?.color }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{typeConf.emoji}</span>
                      <h3 className="font-medium">{ev.title}</h3>
                      {ev.recurring && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400"><Repeat className="w-2 h-2 inline mr-0.5" />{ev.recurring}</span>}
                    </div>
                    {ev.description && <p className="text-sm text-slate-400 mt-1">{ev.description}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      {ev.time && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(ev.time)}</span>}
                      <span className="text-xs font-medium" style={{ color: agent?.color }}>{agent?.name}</span>
                      {ev.client && <span className="text-xs text-slate-500">{ev.client}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Agent Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(AGENTS).slice(0, 6).map(([id, a]) => (
          <div key={id} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
            <span className="text-[10px] text-slate-500">{a.name}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showAdd && <AddEventModal defaultDate={addDate} onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={handleDelete} />}
    </div>
  );
}
