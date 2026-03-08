"use client";
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function MemoryPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [longterm, setLongterm] = useState("");
  const [tab, setTab] = useState<"daily" | "longterm">("daily");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/memory?type=dates").then(r => r.json()).then(d => setDates(d.dates || []));
    fetch("/api/memory?type=longterm").then(r => r.json()).then(d => setLongterm(d.content || ""));
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetch(`/api/memory?date=${selectedDate}`).then(r => r.json()).then(d => setContent(d.content || ""));
    }
  }, [selectedDate]);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = getDay(start);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Memory</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("daily")} className={`px-4 py-1.5 rounded-md text-sm font-medium ${tab === "daily" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>Daily Notes</button>
        <button onClick={() => setTab("longterm")} className={`px-4 py-1.5 rounded-md text-sm font-medium ${tab === "longterm" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>Long-term Memory</button>
      </div>

      {tab === "longterm" ? (
        <div className="bg-card border border-border rounded-lg p-6 prose prose-invert max-w-none">
          <ReactMarkdown>{longterm}</ReactMarkdown>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="w-80 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded"><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium flex-1 text-center">{format(currentMonth, "MMMM yyyy")}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground p-1">{d}</div>
              ))}
              {Array.from({ length: startPad }).map((_, i) => <div key={`p${i}`} />)}
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const hasMemory = dates.includes(dateStr);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => hasMemory && setSelectedDate(dateStr)}
                    className={`text-center text-sm p-1.5 rounded transition-colors
                      ${isToday(day) ? "ring-1 ring-primary" : ""}
                      ${isSelected ? "bg-primary text-primary-foreground" : ""}
                      ${hasMemory && !isSelected ? "bg-primary/20 text-primary hover:bg-primary/30" : ""}
                      ${!hasMemory ? "text-muted-foreground/50" : "cursor-pointer"}
                    `}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded bg-primary/20 mr-1" /> = has notes
            </div>
          </div>

          <div className="flex-1">
            {selectedDate ? (
              <div>
                <h2 className="text-lg font-semibold mb-3">{format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d, yyyy")}</h2>
                <div className="bg-card border border-border rounded-lg p-6 prose prose-invert max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-20">
                <p className="text-lg">Select a date to view memory notes</p>
                <p className="text-sm mt-1">Highlighted dates have notes</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
