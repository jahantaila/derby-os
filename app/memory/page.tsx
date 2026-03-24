"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

type TabId = "journal" | "agents" | "all";

const CATEGORY_CONFIG: Record<string, { label: string; tone: string; emoji: string }> = {
  core: { label: "Core", tone: "bg-[#2093FF]/12 text-[#8ec9ff] border-[#2093FF]/30", emoji: "🧠" },
  daily: { label: "Daily Log", tone: "bg-amber-500/12 text-amber-200 border-amber-400/30", emoji: "📝" },
  client: { label: "Client", tone: "bg-emerald-500/12 text-emerald-200 border-emerald-400/30", emoji: "🏢" },
  system: { label: "System", tone: "bg-rose-500/12 text-rose-200 border-rose-400/30", emoji: "⚙️" },
  agent: { label: "Agent", tone: "bg-sky-500/12 text-sky-200 border-sky-400/30", emoji: "🤖" },
  lesson: { label: "Lesson", tone: "bg-orange-500/12 text-orange-200 border-orange-400/30", emoji: "💡" },
};

const AGENT_CONFIG = {
  kimberly: { label: "Kimberly", emoji: "👑", tone: "border-amber-400/30 bg-amber-500/10 text-amber-100", keywords: ["kimberly", "soul.md", "agents.md", "memory.md", "tools.md"], department: "Executive" },
  kevin: { label: "Kevin", emoji: "🛠️", tone: "border-[#2093FF]/30 bg-[#2093FF]/10 text-sky-100", keywords: ["kevin", "spec", "skill", "agent.md"], department: "Development" },
  alex: { label: "Alex", emoji: "📣", tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100", keywords: ["alex"], department: "Marketing" },
  sabri: { label: "Sabri", emoji: "🎯", tone: "border-orange-400/30 bg-orange-500/10 text-orange-100", keywords: ["sabri"], department: "Marketing" },
  jordan: { label: "Jordan", emoji: "🤝", tone: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100", keywords: ["jordan"], department: "Sales" },
} as const;

const TAB_CONFIG: Array<{ id: TabId; label: string; icon: typeof CalendarDays }> = [
  { id: "journal", label: "Journal", icon: CalendarDays },
  { id: "agents", label: "Agents", icon: Users2 },
  { id: "all", label: "All Files", icon: FolderOpen },
];

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
    const boldified = line.replace(/\*\*(.+?)\*\*/g, '<b class="text-white">$1</b>');
    if (boldified !== line) return <p key={i} className="text-sm text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: boldified }} />;
    return <p key={i} className="text-sm text-slate-400 leading-relaxed">{line}</p>;
  });
}

function formatDateLabel(value: string, withYear = true) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreview(memory: Memory) {
  return memory.summary || memory.content?.replace(/\s+/g, " ").trim() || "No preview available.";
}

function getFileSize(memory: Memory) {
  const bytes = new Blob([memory.content || memory.summary || ""]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getDateKey(memory: Memory) {
  const source = memory.last_modified || memory.created_at;
  return new Date(source).toISOString().slice(0, 10);
}

function inferAgent(memory: Memory) {
  const haystack = `${memory.filename} ${memory.title} ${memory.content || ""}`.toLowerCase();
  for (const [key, config] of Object.entries(AGENT_CONFIG)) {
    if (config.keywords.some((keyword) => haystack.includes(keyword))) return key as keyof typeof AGENT_CONFIG;
  }
  return null;
}

function DetailPanel({
  memory,
  onClose,
}: {
  memory: Memory | null;
  onClose: () => void;
}) {
  if (!memory) {
    return (
      <div className="glass-panel flex min-h-[420px] items-center justify-center p-8 text-center">
        <div>
          <FileText className="mx-auto mb-4 h-14 w-14 text-slate-700" />
          <p className="text-sm text-slate-400">Select a memory document to inspect.</p>
          <p className="mt-1 text-xs text-slate-600">The markdown viewer remains unchanged.</p>
        </div>
      </div>
    );
  }

  const category = CATEGORY_CONFIG[memory.category || "core"] || CATEGORY_CONFIG.core;

  return (
    <div className="glass-panel flex min-h-[420px] flex-col overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-white">{memory.title}</h2>
              <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", category.tone)}>
                {category.emoji} {category.label}
              </span>
            </div>
            <p className="mt-2 truncate font-mono text-xs text-slate-500">{memory.filename}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span className="font-mono">{formatTimestamp(memory.last_modified)}</span>
              <span>{getFileSize(memory)}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-500 transition hover:border-white/20 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {memory.summary ? (
        <div className="border-b border-[#2093FF]/10 bg-[#2093FF]/[0.06] px-5 py-3">
          <p className="text-sm text-slate-300">
            <span className="font-medium text-[#8ec9ff]">Summary</span> {memory.summary}
          </p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {memory.content ? (
          <div className="document-content max-w-none">
            {renderContent(memory.content)}
          </div>
        ) : (
          <p className="text-sm italic text-slate-500">No content available.</p>
        )}
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<TabId>("journal");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedJournal, setExpandedJournal] = useState<Record<string, boolean>>({});
  const [collapsedAgents, setCollapsedAgents] = useState<Record<string, boolean>>({
    kimberly: false,
    kevin: false,
    alex: false,
    sabri: false,
    jordan: false,
  });

  const dateRefs = useRef<Record<string, HTMLElement | null>>({});

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      const q = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/memories${q}`);
      const data = await res.json();
      if (data.memories) {
        setMemories(data.memories);
        setSelectedId((current) => current ?? data.memories[0]?.id ?? null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const allFiles = useMemo(
    () => [...memories].sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()),
    [memories],
  );

  const filteredAllFiles = useMemo(() => {
    if (filterCategory === "all") return allFiles;
    return allFiles.filter((memory) => memory.category === filterCategory);
  }, [allFiles, filterCategory]);

  const journalEntries = useMemo(
    () =>
      allFiles
        .filter((memory) => memory.category === "daily")
        .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()),
    [allFiles],
  );

  const journalDates = useMemo(() => Array.from(new Set(journalEntries.map(getDateKey))), [journalEntries]);

  const agentGroups = useMemo(() => {
    const grouped = Object.keys(AGENT_CONFIG).reduce((acc, key) => {
      acc[key] = [] as Memory[];
      return acc;
    }, {} as Record<string, Memory[]>);

    allFiles.forEach((memory) => {
      const inferred = inferAgent(memory);
      if (inferred) grouped[inferred].push(memory);
    });

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
    }

    return grouped;
  }, [allFiles]);

  const selectedMemory = useMemo(
    () => allFiles.find((memory) => memory.id === selectedId) || null,
    [allFiles, selectedId],
  );

  const lastUpdated = allFiles[0]?.last_modified || null;
  const agentConfigsCount = useMemo(
    () => Object.values(agentGroups).reduce((sum, group) => sum + group.length, 0),
    [agentGroups],
  );

  const stats = [
    { label: "Total Memory Files", value: `${allFiles.length}`, icon: Brain, accent: "text-[#8ec9ff]" },
    { label: "Last Updated", value: lastUpdated ? formatTimestamp(lastUpdated) : "No data", icon: Clock3, accent: "text-amber-200", mono: true },
    { label: "Daily Entries", value: `${journalEntries.length}`, icon: CalendarDays, accent: "text-emerald-200" },
    { label: "Agent Configs", value: `${agentConfigsCount}`, icon: Shield, accent: "text-orange-200" },
  ];

  const jumpToDate = (dateKey: string) => {
    dateRefs.current[dateKey]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#2093FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-5 text-white sm:px-6">
      <section className="glass-panel page-header relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(32,147,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2093FF]/20 bg-[#2093FF]/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#8ec9ff]">
                <Sparkles className="h-3.5 w-3.5" />
                Derby OS Memory
              </div>
              <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight text-white">
                <Brain className="h-8 w-8 text-[#2093FF]" />
                Memory Archive
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Daily journals, agent memory documents, and the full Supabase-backed archive in one view.
              </p>
            </div>

            <button
              onClick={fetchMemories}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200 transition hover:border-[#2093FF]/30 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="glass-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                      <p className={cn("mt-3 text-xl font-semibold text-white", stat.mono && "font-mono text-base sm:text-lg")}>{stat.value}</p>
                    </div>
                    <Icon className={cn("h-5 w-5", stat.accent)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <section className="space-y-6">
          <div className="glass-panel p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {TAB_CONFIG.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                        active
                          ? "border-[#2093FF]/40 bg-[#2093FF]/14 text-white shadow-[0_0_24px_rgba(32,147,255,0.18)]"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1 sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search memory files..."
                    className="w-full rounded-2xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#2093FF]/40"
                  />
                </div>

                {activeTab === "all" ? (
                  <select
                    value={filterCategory}
                    onChange={(event) => setFilterCategory(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(CATEGORY_CONFIG).map(([id, category]) => (
                      <option key={id} value={id}>
                        {category.emoji} {category.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
          </div>

          {activeTab === "journal" ? (
            <section className="space-y-4">
              <div className="glass-panel overflow-hidden p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Daily Journal</h2>
                    <p className="mt-1 text-xs text-slate-500">Newest entries first. Jump directly to a day from the strip.</p>
                  </div>
                  <span className="font-mono text-xs text-slate-500">{journalEntries.length} entries</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {journalDates.map((dateKey) => (
                    <button
                      key={dateKey}
                      onClick={() => jumpToDate(dateKey)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-slate-300 transition hover:border-[#2093FF]/30 hover:text-white"
                    >
                      {formatDateLabel(dateKey, false)}
                    </button>
                  ))}
                </div>
              </div>

              {journalEntries.length === 0 ? (
                <div className="glass-panel p-8 text-center text-sm text-slate-400">No daily memory entries found.</div>
              ) : (
                journalEntries.map((memory) => {
                  const dateKey = getDateKey(memory);
                  const expanded = !!expandedJournal[memory.id];
                  return (
                    <article
                      key={memory.id}
                      ref={(node) => {
                        dateRefs.current[dateKey] = node;
                      }}
                      className={cn(
                        "glass-panel p-5 transition",
                        selectedId === memory.id && "border-[#2093FF]/28 shadow-[0_0_28px_rgba(32,147,255,0.14)]",
                      )}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#8ec9ff]">{formatDateLabel(dateKey)}</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{memory.title}</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                            {getPreview(memory)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedId(memory.id)}
                            className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
                          >
                            Open Viewer
                          </button>
                          <button
                            onClick={() => setExpandedJournal((current) => ({ ...current, [memory.id]: !current[memory.id] }))}
                            className="inline-flex items-center gap-2 rounded-full border border-[#2093FF]/24 bg-[#2093FF]/10 px-3 py-2 text-xs text-[#8ec9ff] transition hover:border-[#2093FF]/40"
                          >
                            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {expanded ? "Hide Details" : "See Details"}
                          </button>
                        </div>
                      </div>

                      {expanded && memory.content ? (
                        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="document-content">{renderContent(memory.content)}</div>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </section>
          ) : null}

          {activeTab === "agents" ? (
            <section className="space-y-4">
              {Object.entries(AGENT_CONFIG).map(([agentKey, config]) => {
                const memoriesForAgent = agentGroups[agentKey] || [];
                const collapsed = !!collapsedAgents[agentKey];
                return (
                  <article key={agentKey} className={cn("glass-panel overflow-hidden", config.tone)}>
                    <button
                      onClick={() => setCollapsedAgents((current) => ({ ...current, [agentKey]: !current[agentKey] }))}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-xl">
                          {config.emoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              {config.department}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-300">{memoriesForAgent.length} memory documents</p>
                        </div>
                      </div>
                      {collapsed ? <ChevronRight className="h-5 w-5 text-slate-300" /> : <ChevronDown className="h-5 w-5 text-slate-300" />}
                    </button>

                    {!collapsed ? (
                      <div className="border-t border-white/10 px-5 py-4">
                        {memoriesForAgent.length === 0 ? (
                          <p className="text-sm text-slate-400">No matching files found for this agent.</p>
                        ) : (
                          <div className="space-y-3">
                            {memoriesForAgent.map((memory) => (
                              <button
                                key={memory.id}
                                onClick={() => setSelectedId(memory.id)}
                                className={cn(
                                  "glass-card block w-full rounded-2xl p-4 text-left transition hover:-translate-y-0.5",
                                  selectedId === memory.id && "border-[#2093FF]/30",
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">{memory.filename}</p>
                                    <p className="mt-1 font-mono text-[11px] text-slate-500">{formatTimestamp(memory.last_modified)}</p>
                                  </div>
                                  <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-400">
                                    {CATEGORY_CONFIG[memory.category || "core"]?.label || "File"}
                                  </span>
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm text-slate-300">{getPreview(memory)}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          ) : null}

          {activeTab === "all" ? (
            <section className="space-y-3">
              {filteredAllFiles.length === 0 ? (
                <div className="glass-panel p-8 text-center text-sm text-slate-400">No memory files match the current filters.</div>
              ) : (
                filteredAllFiles.map((memory) => {
                  const category = CATEGORY_CONFIG[memory.category || "core"] || CATEGORY_CONFIG.core;
                  return (
                    <button
                      key={memory.id}
                      onClick={() => setSelectedId(memory.id)}
                      className={cn(
                        "glass-card block w-full rounded-2xl p-5 text-left transition hover:-translate-y-0.5",
                        selectedId === memory.id && "border-[#2093FF]/30 shadow-[0_0_28px_rgba(32,147,255,0.14)]",
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-white">{memory.title}</h3>
                            <span className={cn("rounded-full border px-2 py-1 text-[11px] font-medium", category.tone)}>
                              {category.emoji} {category.label}
                            </span>
                          </div>
                          <p className="mt-2 truncate font-mono text-xs text-slate-500">{memory.filename}</p>
                          <p className="mt-3 line-clamp-2 text-sm text-slate-300">{getPreview(memory)}</p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-mono">
                            {formatTimestamp(memory.last_modified)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                            {getFileSize(memory)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </section>
          ) : null}
        </section>

        <aside className="xl:sticky xl:top-5 xl:self-start">
          <DetailPanel memory={selectedMemory} onClose={() => setSelectedId(null)} />
        </aside>
      </div>
    </div>
  );
}
