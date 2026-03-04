"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

type Event = { id: string; name: string; time: string; recurrence: string; type: string; status: string; description: string; date?: string };

const typeColors: Record<string, string> = { cron: "bg-blue-500/20 text-blue-400 border-blue-500/30", task: "bg-green-500/20 text-green-400 border-green-500/30", reminder: "bg-purple-500/20 text-purple-400 border-purple-500/30" };

export default function CalendarPage() {
  const { data: events, add, remove } = useData<Event[]>("/api/calendar", []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", time: "09:00", recurrence: "none", type: "task", description: "", date: format(new Date(), "yyyy-MM-dd") });

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = getDay(start);

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayOfWeek = format(day, "EEEE").toLowerCase().slice(0, 3);
    return events.filter(e => {
      if (e.date === dateStr) return true;
      if (e.recurrence === "daily") return true;
      if (e.recurrence?.startsWith("weekly-") && e.recurrence.endsWith(dayOfWeek)) return true;
      return false;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1">
          <Plus size={16} /> Add Event
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded"><ChevronLeft size={20} /></button>
        <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded"><ChevronRight size={20} /></button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-card p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card p-2 min-h-[100px]" />
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          return (
            <div key={day.toISOString()} className={`bg-card p-2 min-h-[100px] ${isToday(day) ? "ring-1 ring-primary" : ""}`}>
              <span className={`text-sm ${isToday(day) ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map(e => (
                  <button key={e.id} onClick={() => setSelected(e)} className={`w-full text-left text-xs px-1.5 py-0.5 rounded border ${typeColors[e.type] || ""} truncate`}>
                    {e.time} {e.name}
                  </button>
                ))}
                {dayEvents.length > 3 && <span className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <button onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Time:</span> {selected.time}</p>
              <p><span className="text-muted-foreground">Type:</span> <span className={`px-2 py-0.5 rounded text-xs ${typeColors[selected.type]}`}>{selected.type}</span></p>
              <p><span className="text-muted-foreground">Recurrence:</span> {selected.recurrence}</p>
              <p><span className="text-muted-foreground">Status:</span> {selected.status}</p>
              <p className="text-muted-foreground">{selected.description}</p>
            </div>
            <button onClick={() => { remove(selected.id); setSelected(null); }} className="mt-4 text-sm text-destructive hover:underline">Delete Event</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Event</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Event name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <div className="flex gap-3">
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm" />
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3">
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option value="task">Task</option><option value="cron">Cron</option><option value="reminder">Reminder</option>
                </select>
                <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option value="none">One-time</option><option value="daily">Daily</option><option value="weekly-mon">Weekly Mon</option><option value="weekly-fri">Weekly Fri</option>
                </select>
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={2} />
              <button onClick={async () => { await add({ ...form, status: "active" }); setShowForm(false); }} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium">Create Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
