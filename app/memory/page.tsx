"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain, ChevronDown, ChevronRight, Clock, FileText, Folder,
  Loader2, RefreshCw, Search, Tag, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface Memory {
  id: string;
  title: string;
  filename: string;
  content: string | null;
  summary: string | null;
  category: string | null;
  last_modified: string;
  created_at: string;
}

/* ── Constants ── */
const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  core: { label: "Core", color: "#2093FF", emoji: "🧠" },
  daily: { label: "Daily Log", color: "#FFBD59", emoji: "📝" },
  client: { label: "Client", color: "#22C55E", emoji: "🏢" },
  system: { label: "System", color: "#F93C3C", emoji: "⚙️" },
  agent: { label: "Agent", color: "#A855F7", emoji: "🤖" },
  lesson: { label: "Lesson", color: "#EC4899", emoji: "💡" },
};

/* ── Markdown-ish renderer ── */
function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-slate-200 mt-3 mb-1.5">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-base font-medium text-slate-300 mt-2 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith("- **") && line.includes("**")) {
      const boldEnd = line.indexOf("**", 4);
      return <div key={i} className="flex gap-2 py-0.5 pl-2"><span className="text-slate-600">•</span><span><strong className="text-white">{line.slice(4, boldEnd)}</strong><span className="text-slate-400">{line.slice(boldEnd + 2)}</span></span></div>;
    }
    if (line.startsWith("- ")) return <div key={i} className="flex gap-2 py-0.5 pl-2"><span className="text-slate-600">•</span><span className="text-slate-400">{line.slice(2)}</span></div>;
    if (line.startsWith("- [x]")) return <div key={i} className="flex gap-2 py-0.5 pl-2"><span className="text-green-400">✓</span><span className="text-slate-500 line-through">{line.slice(5)}</span></div>;
    if (line.startsWith("- [ ]")) return <div key={i} className="flex gap-2 py-0.5 pl-2"><span className="text-slate-600">○</span><span className="text-slate-400">{line.slice(5)}</span></div>;
    if (line.startsWith("```")) return <div key={i} className="text-[10px] text-slate-600 font-mono">{line}</div>;
    if (line.startsWith(">")) return <div key={i} className="border-l-2 border-[#2093FF]/30 pl-3 text-slate-500 italic text-sm py-0.5">{line.slice(1).trim()}</div>;
    if (line.startsWith("---")) return <hr key={i} className="border-white/5 my-3" />;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    // Bold text
    const boldified = line.replace(/\*\*(.+?)\*\*/g, '<b class="text-white">$1</b>');
    if (boldified !== line) return <p key={i} className="text-sm text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: boldified }} />;
    return <p key={i} className="text-sm text-slate-400 leading-relaxed">{line}</p>;
  });
}

/* ── Memory Card ── */
function MemoryCard({ memory, isActive, onClick }: { memory: Memory; isActive: boolean; onClick: () => void }) {
  const cat = CATEGORY_CONFIG[memory.category || "core"] || CATEGORY_CONFIG.core;
  const lines = memory.content?.split("\n").length || 0;
  const modified = new Date(memory.last_modified).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div onClick={onClick}
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all",
        isActive
          ? "bg-[#2093FF]/10 border-[#2093FF]/30"
          : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
      )}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{cat.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-white truncate">{memory.title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{memory.filename}</p>
          {memory.summary && <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{memory.summary}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
            <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{modified}</span>
            <span className="text-[10px] text-slate-600">{lines} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [highlightText, setHighlightText] = useState("");

  const fetchMemories = useCallback(async () => {
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/memories${q}`);
      const data = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setHighlightText(searchInput); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    if (filterCategory === "all") return memories;
    return memories.filter(m => m.category === filterCategory);
  }, [memories, filterCategory]);

  const selected = useMemo(() => memories.find(m => m.id === selectedId) || null, [memories, selectedId]);

  // Content with search highlighting
  const highlightedContent = useMemo(() => {
    if (!selected?.content) return null;
    if (!highlightText) return selected.content;
    return selected.content;
  }, [selected, highlightText]);

  const stats = useMemo(() => ({
    total: memories.length,
    categories: [...new Set(memories.map(m => m.category))].length,
    totalLines: memories.reduce((sum, m) => sum + (m.content?.split("\n").length || 0), 0),
  }), [memories]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#2093FF]" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6 text-[#2093FF]" /> Memory</h1>
          <p className="text-slate-500 text-sm mt-1">{stats.total} memories · {stats.totalLines} lines · {stats.categories} categories</p>
        </div>
        <button onClick={fetchMemories} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search memories..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:border-[#2093FF] outline-none" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([id, c]) => <option key={id} value={id}>{c.emoji} {c.label}</option>)}
        </select>
      </div>

      {/* Split layout */}
      <div className="flex gap-6" style={{ height: "calc(100vh - 200px)" }}>
        {/* Left: Memory list */}
        <div className="w-[360px] flex-shrink-0 space-y-2 overflow-y-auto pr-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Brain className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No memories found</p>
            </div>
          ) : filtered.map(m => (
            <MemoryCard key={m.id} memory={m} isActive={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
          ))}
        </div>

        {/* Right: Content viewer */}
        <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          {selected ? (
            <div className="h-full flex flex-col">
              {/* Document header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selected.filename}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {/* Summary */}
              {selected.summary && (
                <div className="px-6 py-3 bg-[#2093FF]/5 border-b border-[#2093FF]/10">
                  <p className="text-xs text-[#2093FF]"><strong>Summary:</strong> {selected.summary}</p>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {highlightedContent ? (
                  <div className="prose prose-invert max-w-none">
                    {renderContent(highlightedContent)}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-sm">No content available</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500">Select a memory to view</p>
                <p className="text-slate-600 text-xs mt-1">Click on any memory document from the left panel</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
